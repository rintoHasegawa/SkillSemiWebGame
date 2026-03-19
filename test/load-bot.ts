/**
 * load-bot
 * 実際のプレイヤーと同等の通信・ゲームプレイをシミュレートする負荷テスト用ボット
 */
import { io } from "socket.io-client";
import { config as sharedConfig } from "@repo/shared";
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
  BOMB_COOLDOWN_MS,
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

// current-players で配信されるプレイヤー情報
type CurrentPlayerPayload =
  | { id: string; name: string; teamId: number }
  | { id: string; name: string; teamId: number; x: number; y: number };

// game-start で受信するゲーム開始情報
type GameStartPayload = {
  startTime: number;
  serverNow: number;
  fieldSizePreset: string;
  gridCols: number;
  gridRows: number;
};

// bomb-placed で受信する他プレイヤーの爆弾情報
type BombPlacedPayload = {
  bombId: string;
  ownerTeamId: number;
  x: number;
  y: number;
  explodeAtElapsedMs: number;
};

// bomb-placed-ack で受信する自分の爆弾確定情報
type BombPlacedAckPayload = {
  bombId: string;
  requestId: string;
};

// ハリケーン状態
type HurricaneStatePayload = {
  id: string;
  x: number;
  y: number;
  radius: number;
  rotationRad: number;
};

// 追跡中の爆弾
type TrackedBomb = {
  bombId: string;
  x: number;
  y: number;
  explodeAtElapsedMs: number;
};

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
  bombCooldownMs: BOMB_COOLDOWN_MS,
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
  });

  let moveTimer: NodeJS.Timeout | null = null;
  let pingTimer: NodeJS.Timeout | null = null;
  let bombCheckTimer: NodeJS.Timeout | null = null;

  // フィールドサイズ（game-start で上書きされる）
  let fieldMaxX = MAX_X;
  let fieldMaxY = MAX_Y;

  let posX = BOT_RADIUS + Math.random() * (MAX_X - BOT_RADIUS * 2);
  let posY = BOT_RADIUS + Math.random() * (MAX_Y - BOT_RADIUS * 2);
  let dirX = 1;
  let dirY = 0;

  let gameStarted = false;
  let gameEnded = false;
  let readySent = false;

  // サーバーとのクロックオフセット補正（serverNow - Date.now()）
  let clockOffsetMs = 0;

  // ゲーム開始時刻（サーバー時計基準，ms）
  let gameStartTimeMs: number | null = null;

  // 被弾スタン状態
  let stunUntilMs = 0;

  // 爆弾
  let lastBombPlacedElapsedMs = Number.NEGATIVE_INFINITY;
  let bombRequestSerial = 0;
  // requestId → bombId のマッピング（ack受信後に確定）
  const pendingBombRequestIds = new Set<string>();
  // 追跡中の爆弾一覧（自分 + 他プレイヤー）
  const trackedBombs = new Map<string, TrackedBomb>();

  // ハリケーン状態
  const hurricanes = new Map<string, HurricaneStatePayload>();

  const getServerNow = (): number => Date.now() + clockOffsetMs;

  const getElapsedMs = (): number | null => {
    if (gameStartTimeMs === null) return null;
    return Math.max(0, getServerNow() - gameStartTimeMs);
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

  // 爆弾範囲内チェック + bomb-hit-report 送信
  const checkAndReportBombHits = () => {
    const elapsedMs = getElapsedMs();
    if (elapsedMs === null || !gameStarted) return;

    for (const [bombId, bomb] of trackedBombs) {
      if (elapsedMs >= bomb.explodeAtElapsedMs) {
        // 爆弾が爆発したタイミング
        const dx = posX - bomb.x;
        const dy = posY - bomb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const blastRadius =
          GAME_CONFIG.BOMB_RADIUS_GRID + GAME_CONFIG.PLAYER_RADIUS;
        if (dist <= blastRadius) {
          socket.emit("bomb-hit-report", { bombId });
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

    pendingBombRequestIds.add(requestId);
    socket.emit("place-bomb", {
      requestId,
      x: posX,
      y: posY,
      explodeAtElapsedMs,
    });
    lastBombPlacedElapsedMs = elapsedMs;
  };

  const tickMove = () => {
    if (!BOT_CAN_MOVE || isStunned()) return;

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

    socket.emit("move", { x: posX, y: posY });
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
        socket.emit("ping", Date.now());
      }
    }, 5000);
    // 初回 ping を即時送信
    socket.emit("ping", Date.now());
  };

  const startBombCheckTimer = () => {
    bombCheckTimer = setInterval(checkAndReportBombHits, 100);
  };

  const stopAllTimers = () => {
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
    socket.emit("join-room", { roomId, playerName });
    counters.joined += 1;

    if (START_GAME && isOwner) {
      setTimeout(() => {
        socket.emit("start-game", {});
        counters.startSent += 1;
      }, START_DELAY_MS);
    }

    startPingTimer();
  });

  // クロックオフセット補正
  socket.on("pong", (payload: { clientTime: number; serverTime: number }) => {
    const rtt = Date.now() - payload.clientTime;
    clockOffsetMs = payload.serverTime + rtt / 2 - Date.now();
  });

  socket.on("game-start", (payload?: GameStartPayload) => {
    counters.gameStarts += 1;
    gameStarted = true;

    if (payload) {
      // サーバー時計基準でクロックオフセットを補正
      if (typeof payload.serverNow === "number") {
        clockOffsetMs = payload.serverNow - Date.now();
      }
      if (
        typeof payload.startTime === "number" &&
        Number.isFinite(payload.startTime)
      ) {
        gameStartTimeMs = payload.startTime;
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
    } else if (gameStartTimeMs === null) {
      gameStartTimeMs = getServerNow();
    }

    if (!readySent) {
      socket.emit("ready-for-game");
      readySent = true;
    }

    startBombCheckTimer();
  });

  // 初期プレイヤー一覧（自分の座標を同期）
  socket.on("current-players", (players: CurrentPlayerPayload[]) => {
    const self = players.find((p) => p.id === socket.id);
    if (self && "x" in self && "y" in self) {
      posX = self.x;
      posY = self.y;
    }

    if (gameStarted) {
      startMoveTimer();
    }
  });

  // 他プレイヤーの位置差分（update-players は追跡用途のみ，ボット制御には不要）
  // socket.on("update-players", ...) は省略（負荷テストでは自分の動きのみ制御）

  // 新規参加プレイヤー通知（追跡不要，受信のみ）
  // socket.on("new-player", ...) は省略

  // プレイヤー退場通知
  socket.on("remove-player", (_playerId: string) => {
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
  socket.on("hurricane-hit", (payload: { playerId: string }) => {
    if (payload.playerId !== socket.id) return;
    applyHitStun(GAME_CONFIG.PLAYER_HIT_STUN_MS);
  });

  // 他プレイヤーの爆弾設置通知
  socket.on("bomb-placed", (payload: BombPlacedPayload) => {
    trackedBombs.set(payload.bombId, {
      bombId: payload.bombId,
      x: payload.x,
      y: payload.y,
      explodeAtElapsedMs: payload.explodeAtElapsedMs,
    });
  });

  // 自分の爆弾設置確定（requestId → bombId マッピング）
  socket.on("bomb-placed-ack", (payload: BombPlacedAckPayload) => {
    pendingBombRequestIds.delete(payload.requestId);
    // 自分の爆弾も追跡対象に追加（爆発時に自分が範囲外なら報告しない）
    // サーバー側で自爆は処理しないため追加不要
  });

  // 被弾通知（自分または他プレイヤー）
  socket.on("player-hit", (payload: { playerId: string }) => {
    if (payload.playerId !== socket.id) return;
    // リスポーン判定はサーバーが行うが，スタン時間はクライアントで制御
    applyHitStun(GAME_CONFIG.PLAYER_HIT_STUN_MS);
  });

  // ゲーム終了
  socket.on("game-end", () => {
    gameEnded = true;
    stopAllTimers();
  });

  // 最終結果（受信のみ）
  socket.on("game-result", () => {
    gameEnded = true;
    stopAllTimers();
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
