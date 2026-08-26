/**
 * load-bot
 * 実際のプレイヤーと同等の通信・ゲームプレイをシミュレートする負荷テスト用ボット
 */
import { io } from "socket.io-client";
import { config as sharedConfig, contracts as protocol } from "@repo/shared";
import type {
  BombHitReportPayload,
  BombPlacedAckPayload,
  BombPlacedPayload,
  CurrentPlayersPayload,
  GameStartPayload,
  HurricaneHitPayload,
  HurricaneStatePayload,
  JoinRoomPayload,
  MovePayload,
  PingPayload,
  PlaceBombPayload,
  PlayerHitPayload,
  PongPayload,
  RemovePlayerPayload,
  StartGameRequestPayload,
} from "@repo/shared";
import {
  BOTS,
  BOT_CAN_MOVE,
  BOT_CAN_PLACE_BOMB,
  DURATION_MS,
  JOIN_DELAY_MS,
  MAX_X,
  MAX_Y,
  MOVE_TICK_MS,
  BOT_SPEED,
  BOT_RADIUS,
  BOMB_FUSE_MS,
  ROOM_ID,
  SOCKET_PATH,
  SOCKET_TRANSPORTS,
  START_DELAY_MS,
  START_GAME,
  DEV_URL,
  URL,
} from "./load-bot.constants.js";

const { GAME_CONFIG } = sharedConfig;

type Stats = {
  connected: number;
  joined: number;
  startSent: number;
  moveSent: number;
  disconnects: number;
  errors: number;
  gameStarts: number;
};

type Bot = {
  stop: () => void;
};

// 追跡中の爆弾（bomb-placed のペイロードをそのまま保持する）
type TrackedBomb = BombPlacedPayload;

// 実行後の簡易サマリ用カウンタ
const stats: Stats = {
  connected: 0,
  joined: 0,
  startSent: 0,
  moveSent: 0,
  disconnects: 0,
  errors: 0,
  gameStarts: 0,
};

const bots: Bot[] = [];

const args = new Set(process.argv.slice(2));
const useDev = args.has("--dev");
const targetUrl = useDev ? DEV_URL : URL;

console.log("Load test starting...", {
  env: useDev ? "dev" : "prod",
  url: targetUrl,
  bots: BOTS,
  roomId: ROOM_ID,
  durationMs: DURATION_MS,
  joinDelayMs: JOIN_DELAY_MS,
  botCanMove: BOT_CAN_MOVE,
  startGame: START_GAME,
  startDelayMs: START_DELAY_MS,
  moveTickMs: MOVE_TICK_MS,
  botSpeed: BOT_SPEED,
  botRadius: BOT_RADIUS,
  bombCooldownMs: GAME_CONFIG.BOMB_NORMAL_COOLDOWN_MS,
  bombFuseMs: BOMB_FUSE_MS,
  botCanPlaceBomb: BOT_CAN_PLACE_BOMB,
  maxX: MAX_X,
  maxY: MAX_Y,
});

// 接続スパイクを避けるため参加タイミングを分散
for (let i = 0; i < BOTS; i += 1) {
  const delay = i * JOIN_DELAY_MS;
  setTimeout(() => {
    const bot = createBot(i, stats, targetUrl);
    bots.push(bot);
  }, delay);
}

// 指定時間後に全ボットを停止。無期限の場合は停止タイマーを設定しない
if (Number.isFinite(DURATION_MS) && DURATION_MS > 0) {
  setTimeout(() => {
    console.log("Stopping bots...");
    for (const bot of bots) {
      bot.stop();
    }
    setTimeout(() => {
      console.log("Final stats:", stats);
      process.exit(0);
    }, 500);
  }, DURATION_MS);
}

function createBot(index: number, counters: Stats, url: string): Bot {
  const roomId = ROOM_ID;
  const playerName = `bot-${index}`;
  const isOwner = index === 0;

  // 固定トランスポートで再接続なしのクライアント接続
  const socket = io(url, {
    transports: SOCKET_TRANSPORTS,
    path: SOCKET_PATH,
    reconnection: false,
    timeout: 10_000,
    // サーバのハンドシェイク照合を通すためプロトコル版を送る
    auth: { protocolVersion: protocol.PROTOCOL_VERSION },
  });

  let moveTimer: NodeJS.Timeout | null = null;
  let pingTimer: NodeJS.Timeout | null = null;
  let bombCheckTimer: NodeJS.Timeout | null = null;
  // ゲームプレイ開始まで待つカウントダウンタイマー
  let gameplayStartTimer: NodeJS.Timeout | null = null;

  // フィールドサイズ（game-start で上書きされる）
  let fieldMaxX = MAX_X;
  let fieldMaxY = MAX_Y;

  let posX = BOT_RADIUS + Math.random() * (MAX_X - BOT_RADIUS * 2);
  let posY = BOT_RADIUS + Math.random() * (MAX_Y - BOT_RADIUS * 2);
  // リスポーン時に戻る初期座標（current-players で確定）
  let spawnX = posX;
  let spawnY = posY;
  let dirX = 1;
  let dirY = 0;

  let gameStarted = false;
  let gameEnded = false;
  let readySent = false;

  // 自分のチームID（current-players で確定，友軍撃ちチェックに使用）
  let myTeamId: number | null = null;

  // 被弾カウント（5回でリスポーン）
  let hitCount = 0;

  // クライアント単調時計からサーバーのゲーム経過msへの変換差分，未同期時は null
  let clockOffsetMs: number | null = null;

  // 被弾スタン状態
  let stunUntilMs = 0;

  // リスポーン待機フラグ（スタン明けのtickMoveで座標リセットを確実に先行させる）
  let pendingRespawn = false;

  // 爆弾
  let lastBombPlacedElapsedMs = Number.NEGATIVE_INFINITY;
  let bombRequestSerial = 0;
  // 追跡中の爆弾一覧（他プレイヤー設置分）
  const trackedBombs = new Map<string, TrackedBomb>();

  // ハリケーン状態
  const hurricanes = new Map<string, HurricaneStatePayload>();

  // 壁時計はステップするため，ゲーム時間には単調時計のみを使う
  const monotonicNowMs = (): number => performance.now();

  // サーバー基準の符号付きゲーム経過ms，カウントダウン中は負，未同期時は null
  const getSignedElapsedMs = (): number | null => {
    if (clockOffsetMs === null) return null;
    return monotonicNowMs() + clockOffsetMs;
  };

  const getElapsedMs = (): number | null => {
    const signedElapsedMs = getSignedElapsedMs();
    if (signedElapsedMs === null) return null;
    return Math.max(0, signedElapsedMs);
  };

  const isStunned = (): boolean => Date.now() < stunUntilMs;

  const applyHitStun = (stunMs: number) => {
    stunUntilMs = Math.max(stunUntilMs, Date.now() + stunMs);
  };

  const updateDirection = () => {
    const angle = Math.random() * Math.PI * 2;
    dirX = Math.cos(angle);
    dirY = Math.sin(angle);
  };

  // ハリケーン回避: 近いハリケーンがあれば逃げる方向へ調整する
  const applyHurricaneAvoidance = () => {
    let avoidX = 0;
    let avoidY = 0;
    let hasNearby = false;
    const avoidDist = GAME_CONFIG.HURRICANE_DIAMETER_GRID * 1.5;

    for (const h of hurricanes.values()) {
      const dx = posX - h.x;
      const dy = posY - h.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < avoidDist && dist > 0) {
        avoidX += dx / dist;
        avoidY += dy / dist;
        hasNearby = true;
      }
    }

    if (hasNearby) {
      const len = Math.sqrt(avoidX * avoidX + avoidY * avoidY);
      dirX = avoidX / len;
      dirY = avoidY / len;
    }
  };

  // 被弾処理（爆弾・ハリケーン共通）: カウント管理とリスポーン判定
  const applyDamage = () => {
    hitCount += 1;
    if (hitCount >= GAME_CONFIG.PLAYER_RESPAWN_HIT_COUNT) {
      // リスポーン: スタン後にtickMove内で確実に座標リセットする
      hitCount = 0;
      pendingRespawn = true;
      applyHitStun(GAME_CONFIG.PLAYER_RESPAWN_STUN_MS);
    } else {
      applyHitStun(GAME_CONFIG.PLAYER_HIT_STUN_MS);
    }
  };

  // 爆弾範囲内チェック + bomb-hit-report 送信
  const checkAndReportBombHits = () => {
    const elapsedMs = getElapsedMs();
    if (elapsedMs === null || !gameStarted) return;

    for (const [bombId, bomb] of trackedBombs) {
      if (elapsedMs >= bomb.explodeAtElapsedMs) {
        // 友軍撃ちは無効（同チームの爆弾には反応しない）
        if (myTeamId !== null && bomb.ownerTeamId === myTeamId) {
          trackedBombs.delete(bombId);
          continue;
        }
        // 爆弾が爆発したタイミングで範囲内なら被弾報告
        const dx = posX - bomb.x;
        const dy = posY - bomb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const blastRadius =
          GAME_CONFIG.BOMB_RADIUS_GRID + GAME_CONFIG.PLAYER_RADIUS;
        if (dist <= blastRadius) {
          // server は player-hit を被弾者自身へ送らないため，ここで hitCount を自前管理する
          applyDamage();
          socket.emit(
            "bomb-hit-report",
            { bombId } satisfies BombHitReportPayload,
          );
        }
        trackedBombs.delete(bombId);
      }
    }
  };

  // フィーバー中かどうか（残り60秒未満）
  const isInFever = (): boolean => {
    const elapsedMs = getElapsedMs();
    if (elapsedMs === null) return false;
    const remainingSec =
      GAME_CONFIG.GAME_DURATION_SEC - elapsedMs / 1000;
    return remainingSec <= GAME_CONFIG.BOMB_FEVER_START_REMAINING_SEC;
  };

  const currentBombCooldownMs = (): number =>
    isInFever()
      ? GAME_CONFIG.BOMB_FEVER_COOLDOWN_MS
      : GAME_CONFIG.BOMB_NORMAL_COOLDOWN_MS;

  const tryPlaceBomb = () => {
    if (!BOT_CAN_PLACE_BOMB || !gameStarted || isStunned()) return;

    const elapsedMs = getElapsedMs();
    if (elapsedMs === null) return;

    if (elapsedMs - lastBombPlacedElapsedMs < currentBombCooldownMs()) return;

    bombRequestSerial += 1;
    const requestId = `${index}-${bombRequestSerial}`;
    const explodeAtElapsedMs = elapsedMs + BOMB_FUSE_MS;

    socket.emit("place-bomb", {
      requestId,
      x: posX,
      y: posY,
      explodeAtElapsedMs,
    } satisfies PlaceBombPayload);
    lastBombPlacedElapsedMs = elapsedMs;
  };

  const tickMove = () => {
    if (!BOT_CAN_MOVE || isStunned()) return;

    // スタン明けのリスポーン: 移動計算より先に座標と方向をリセット
    if (pendingRespawn) {
      pendingRespawn = false;
      posX = spawnX;
      posY = spawnY;
      updateDirection();
    }

    // ハリケーンがいれば回避方向へ
    applyHurricaneAvoidance();

    const dtSec = MOVE_TICK_MS / 1000;
    posX += dirX * BOT_SPEED * dtSec;
    posY += dirY * BOT_SPEED * dtSec;

    if (posX < BOT_RADIUS) {
      posX = BOT_RADIUS;
      updateDirection();
    } else if (posX > fieldMaxX - BOT_RADIUS) {
      posX = fieldMaxX - BOT_RADIUS;
      updateDirection();
    }

    if (posY < BOT_RADIUS) {
      posY = BOT_RADIUS;
      updateDirection();
    } else if (posY > fieldMaxY - BOT_RADIUS) {
      posY = fieldMaxY - BOT_RADIUS;
      updateDirection();
    }

    socket.emit("move", { x: posX, y: posY } satisfies MovePayload);
    counters.moveSent += 1;

    tryPlaceBomb();
  };

  const startMoveTimer = () => {
    if (!moveTimer && BOT_CAN_MOVE && MOVE_TICK_MS > 0) {
      updateDirection();
      moveTimer = setInterval(tickMove, MOVE_TICK_MS);
    }
  };

  const startPingTimer = () => {
    // 5秒ごとに ping を送ってクロックオフセットを更新
    pingTimer = setInterval(() => {
      if (!gameEnded) {
        socket.emit("ping", monotonicNowMs() satisfies PingPayload);
      }
    }, 5000);
    // 初回 ping を即時送信
    socket.emit("ping", monotonicNowMs() satisfies PingPayload);
  };

  const startBombCheckTimer = () => {
    bombCheckTimer = setInterval(checkAndReportBombHits, 100);
  };

  const stopAllTimers = () => {
    if (gameplayStartTimer) {
      clearTimeout(gameplayStartTimer);
      gameplayStartTimer = null;
    }
    if (moveTimer) {
      clearInterval(moveTimer);
      moveTimer = null;
    }
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    if (bombCheckTimer) {
      clearInterval(bombCheckTimer);
      bombCheckTimer = null;
    }
  };

  // ---- イベントハンドラ ----

  socket.on("connect", () => {
    counters.connected += 1;
    socket.emit("join-room", { roomId, playerName } satisfies JoinRoomPayload);
    counters.joined += 1;

    if (START_GAME && isOwner) {
      setTimeout(() => {
        socket.emit("start-game", {} satisfies StartGameRequestPayload);
        counters.startSent += 1;
      }, START_DELAY_MS);
    }

    startPingTimer();
  });

  // クロックオフセット補正（サーバー滞留時間を除いたRTTで片道遅延を推定する）
  socket.on("pong", (payload: PongPayload) => {
    const receivedAtMs = monotonicNowMs();
    const serverProcessingMs =
      payload.serverSentElapsedMs - payload.serverReceivedElapsedMs;
    const rttMs = receivedAtMs - payload.clientTime - serverProcessingMs;
    if (rttMs < 0) return;

    clockOffsetMs = payload.serverSentElapsedMs - (receivedAtMs - rttMs / 2);
  });

  socket.on("game-start", (payload?: GameStartPayload) => {
    counters.gameStarts += 1;

    if (payload) {
      // PONG未着でもカウントダウンを開始できるよう暫定offsetを置く（片道遅延ぶん過小）
      if (
        typeof payload.serverElapsedMs === "number" &&
        Number.isFinite(payload.serverElapsedMs)
      ) {
        clockOffsetMs = payload.serverElapsedMs - monotonicNowMs();
      }
      // 実際のフィールドサイズを反映
      if (
        typeof payload.gridCols === "number" &&
        typeof payload.gridRows === "number"
      ) {
        fieldMaxX = payload.gridCols;
        fieldMaxY = payload.gridRows;
        // 初期座標がフィールド外なら補正
        posX = Math.min(posX, fieldMaxX - BOT_RADIUS);
        posY = Math.min(posY, fieldMaxY - BOT_RADIUS);
      }
    } else if (clockOffsetMs === null) {
      // ペイロード無しの場合は即時プレイ開始とみなす
      clockOffsetMs = -monotonicNowMs();
    }

    if (!readySent) {
      socket.emit("ready-for-game");
      readySent = true;
    }

    // 経過が0になるまで待ってからゲームプレイを開始（移動・爆弾）
    const delayMs = Math.max(0, -(getSignedElapsedMs() ?? 0));
    gameplayStartTimer = setTimeout(() => {
      gameStarted = true;
      startMoveTimer();
      startBombCheckTimer();
    }, delayMs);
  });

  // 初期プレイヤー一覧（自分の座標・チームIDを同期）
  socket.on("current-players", (players: CurrentPlayersPayload) => {
    const self = players.find((p) => p.id === socket.id);
    if (self) {
      myTeamId = self.teamId;
      if ("x" in self && "y" in self) {
        posX = self.x;
        posY = self.y;
        spawnX = self.x;
        spawnY = self.y;
      }
    }

    // 移動タイマーの開始は gameplayStartTimer に委ねる
  });

  // 他プレイヤーの位置差分（update-players は追跡用途のみ，ボット制御には不要）
  // socket.on("update-players", ...) は省略（負荷テストでは自分の動きのみ制御）

  // 新規参加プレイヤー通知（追跡不要，受信のみ）
  // socket.on("new-player", ...) は省略

  // プレイヤー退場通知
  socket.on("remove-player", (_playerId: RemovePlayerPayload) => {
    // 追跡中プレイヤーの削除が必要な場合はここで処理
  });

  // マップ更新（追跡不要，受信のみ）
  // socket.on("update-map-cells", ...) は省略

  // ハリケーン全量スナップショット
  socket.on(
    "current-hurricanes",
    (payload: HurricaneStatePayload[]) => {
      hurricanes.clear();
      for (const h of payload) {
        hurricanes.set(h.id, h);
      }
    },
  );

  // ハリケーン差分更新
  socket.on(
    "update-hurricanes",
    (payload: HurricaneStatePayload[]) => {
      for (const h of payload) {
        hurricanes.set(h.id, h);
      }
    },
  );

  // ハリケーン被弾
  socket.on("hurricane-hit", (payload: HurricaneHitPayload) => {
    if (payload.playerId !== socket.id) return;
    applyDamage();
  });

  // 他プレイヤーの爆弾設置通知
  socket.on("bomb-placed", (payload: BombPlacedPayload) => {
    trackedBombs.set(payload.bombId, {
      bombId: payload.bombId,
      ownerTeamId: payload.ownerTeamId,
      x: payload.x,
      y: payload.y,
      explodeAtElapsedMs: payload.explodeAtElapsedMs,
    });
  });

  // 自分の爆弾設置確定（受信のみ）
  socket.on("bomb-placed-ack", (_payload: BombPlacedAckPayload) => {
    // 自爆はサーバー側で処理しないため追跡不要
  });

  // 被弾通知（server は被弾者自身を除外して送信するため自分宛は届かない。念のため残す）
  socket.on("player-hit", (payload: PlayerHitPayload) => {
    if (payload.playerId !== socket.id) return;
    applyDamage();
  });

  // ゲーム終了: タイマーを止めて切断
  socket.on("game-end", () => {
    gameEnded = true;
    stopAllTimers();
    socket.disconnect();
  });

  // 最終結果受信後も切断（game-end が先に来るが念のため）
  socket.on("game-result", () => {
    if (!gameEnded) {
      gameEnded = true;
      stopAllTimers();
      socket.disconnect();
    }
  });

  socket.on("disconnect", () => {
    counters.disconnects += 1;
    stopAllTimers();
  });

  socket.on("connect_error", () => {
    counters.errors += 1;
  });

  return {
    stop() {
      stopAllTimers();
      socket.disconnect();
    },
  };
}
