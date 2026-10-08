/**
 * bots
 * 検証用の他プレイヤーを Socket.IO で参加させるヘルパー
 * 負荷テスト Bot（test/load-bot.ts）と同じプロトコル（@repo/shared の contracts / config）で振る舞う
 * 爆弾は置かず，参加・準備完了の通知・ランダム移動・結果の受信だけを行う
 */
import { io } from "socket.io-client";
import { config as sharedConfig, contracts } from "@repo/shared";

import { SERVER_URL, assertAllowedUrl } from "./guard.mjs";

const { GAME_CONFIG, NETWORK_CONFIG } = sharedConfig;
const { SocketEvents, PROTOCOL_VERSION } = contracts;

const CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_WAIT_TIMEOUT_MS = 15_000;

/**
 * @typedef {import("@repo/shared").JoinRoomPayload} JoinRoomPayload
 * @typedef {import("@repo/shared").RoomUpdatePayload} RoomUpdatePayload
 * @typedef {import("@repo/shared").RoomJoinRejectedPayload} RoomJoinRejectedPayload
 * @typedef {import("@repo/shared").GameStartPayload} GameStartPayload
 * @typedef {import("@repo/shared").CurrentPlayersPayload} CurrentPlayersPayload
 * @typedef {import("@repo/shared").GameResultPayload} GameResultPayload
 * @typedef {import("@repo/shared").MovePayload} MovePayload
 * @typedef {import("@repo/shared").StartGameRequestPayload} StartGameRequestPayload
 */

/**
 * @typedef {{
 *   name: string,
 *   id: string | null,
 *   isConnected: boolean,
 *   isJoined: boolean,
 *   rejectedReason: string | null,
 *   teamId: number | null,
 *   isGameStarted: boolean,
 *   isGameEnded: boolean,
 *   moveCount: number,
 *   result: GameResultPayload | null,
 *   errors: string[],
 * }} BotState
 */

/**
 * @typedef {{
 *   readonly name: string,
 *   readonly state: BotState,
 *   startGame: (payload?: StartGameRequestPayload) => void,
 *   waitFor: (predicate: (state: BotState) => boolean, options?: { timeoutMs?: number, description?: string }) => Promise<void>,
 *   disconnect: () => void,
 * }} VerifyBot
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 条件を満たすまで待つ（満たさなければ説明付きで例外）
 * @param {() => boolean} isSatisfied
 * @param {{ timeoutMs?: number, description: string }} options
 */
const waitUntil = async (isSatisfied, { timeoutMs = DEFAULT_WAIT_TIMEOUT_MS, description }) => {
  const deadline = Date.now() + timeoutMs;
  while (!isSatisfied()) {
    if (Date.now() > deadline) {
      throw new Error(`${timeoutMs}ms 待っても満たされませんでした: ${description}`);
    }
    await sleep(100);
  }
};

/**
 * Bot を 1 体生成して接続する
 * @param {{ roomId: string, name: string, canMove: boolean, serverUrl: string }} params
 * @returns {VerifyBot}
 */
const createBot = ({ roomId, name, canMove, serverUrl }) => {
  /** @type {BotState} */
  const state = {
    name,
    id: null,
    isConnected: false,
    isJoined: false,
    rejectedReason: null,
    teamId: null,
    isGameStarted: false,
    isGameEnded: false,
    moveCount: 0,
    result: null,
    errors: [],
  };

  const socket = io(serverUrl, {
    path: NETWORK_CONFIG.SOCKET_IO_PATH,
    transports: ["websocket"],
    reconnection: false,
    timeout: CONNECT_TIMEOUT_MS,
    // サーバのハンドシェイク照合を通すためプロトコル版を送る
    auth: { protocolVersion: PROTOCOL_VERSION },
  });

  let fieldCols = GAME_CONFIG.GRID_COLS;
  let fieldRows = GAME_CONFIG.GRID_ROWS;
  let posX = fieldCols / 2;
  let posY = fieldRows / 2;
  let dirX = 1;
  let dirY = 0;
  /** @type {NodeJS.Timeout | null} */
  let moveTimer = null;
  /** @type {NodeJS.Timeout | null} */
  let startTimer = null;
  let isReadySent = false;

  const stopTimers = () => {
    if (moveTimer) clearInterval(moveTimer);
    if (startTimer) clearTimeout(startTimer);
    moveTimer = null;
    startTimer = null;
  };

  const turnRandomly = () => {
    const angle = Math.random() * Math.PI * 2;
    dirX = Math.cos(angle);
    dirY = Math.sin(angle);
  };

  // load-bot と同じ速度・送信間隔で移動し，壁に当たったら向きを変える
  const tickMove = () => {
    const radius = GAME_CONFIG.PLAYER_RADIUS;
    const dtSec = GAME_CONFIG.PLAYER_POSITION_UPDATE_MS / 1000;
    posX += dirX * GAME_CONFIG.PLAYER_SPEED * dtSec;
    posY += dirY * GAME_CONFIG.PLAYER_SPEED * dtSec;
    if (posX < radius || posX > fieldCols - radius) {
      posX = Math.min(Math.max(posX, radius), fieldCols - radius);
      turnRandomly();
    }
    if (posY < radius || posY > fieldRows - radius) {
      posY = Math.min(Math.max(posY, radius), fieldRows - radius);
      turnRandomly();
    }
    /** @type {MovePayload} */
    const payload = { x: posX, y: posY };
    socket.emit(SocketEvents.MOVE, payload);
    state.moveCount += 1;
  };

  socket.on(SocketEvents.CONNECT, () => {
    state.isConnected = true;
    state.id = socket.id ?? null;
    /** @type {JoinRoomPayload} */
    const payload = { roomId, playerName: name };
    socket.emit(SocketEvents.JOIN_ROOM, payload);
  });

  socket.on(SocketEvents.ROOM_UPDATE, (/** @type {RoomUpdatePayload} */ room) => {
    if (room.roomId === roomId && room.players.some((player) => player.id === socket.id)) {
      state.isJoined = true;
    }
  });

  socket.on(SocketEvents.ROOM_JOIN_REJECTED, (/** @type {RoomJoinRejectedPayload} */ payload) => {
    state.rejectedReason = payload.reason;
  });

  socket.on(SocketEvents.GAME_START, (/** @type {GameStartPayload} */ payload) => {
    if (Number.isFinite(payload.gridCols) && Number.isFinite(payload.gridRows)) {
      fieldCols = payload.gridCols;
      fieldRows = payload.gridRows;
    }
    // サーバーは READY_FOR_GAME への応答として GAME_START を再送するため，準備完了の通知は 1 回だけにする
    if (!isReadySent) {
      isReadySent = true;
      socket.emit(SocketEvents.READY_FOR_GAME);
    }

    // 再送された GAME_START で動き出したタイマーを巻き戻さない
    if (state.isGameStarted || startTimer) {
      return;
    }

    // カウントダウン（サーバー経過時間が負の間）が明けてから動き出す
    const delayMs = Math.max(0, -payload.serverElapsedMs);
    startTimer = setTimeout(() => {
      startTimer = null;
      state.isGameStarted = true;
      if (canMove) {
        turnRandomly();
        moveTimer = setInterval(tickMove, GAME_CONFIG.PLAYER_POSITION_UPDATE_MS);
      }
    }, delayMs);
  });

  socket.on(SocketEvents.CURRENT_PLAYERS, (/** @type {CurrentPlayersPayload} */ players) => {
    const self = players.find((player) => player.id === socket.id);
    if (!self) return;
    state.teamId = self.teamId;
    if ("x" in self && "y" in self) {
      posX = self.x;
      posY = self.y;
    }
  });

  socket.on(SocketEvents.GAME_END, () => {
    state.isGameEnded = true;
    stopTimers();
  });

  socket.on(SocketEvents.GAME_RESULT, (/** @type {GameResultPayload} */ payload) => {
    state.isGameEnded = true;
    state.result = payload;
    stopTimers();
  });

  socket.on(SocketEvents.DISCONNECT, () => {
    state.isConnected = false;
    stopTimers();
  });

  socket.on("connect_error", (error) => {
    state.errors.push(`connect_error: ${error.message}`);
  });

  return {
    name,
    state,
    startGame: (payload = {}) => {
      socket.emit(SocketEvents.START_GAME, payload);
    },
    waitFor: (predicate, options = {}) =>
      waitUntil(() => predicate(state), {
        timeoutMs: options.timeoutMs,
        description: `${name}: ${options.description ?? "条件"}`,
      }),
    disconnect: () => {
      stopTimers();
      socket.disconnect();
    },
  };
};

/**
 * Bot の集合を管理するプールを生成する（後始末はランナーが disconnectAll で行う）
 * @param {{ serverUrl?: string }} [options]
 */
export const createBotPool = ({ serverUrl = SERVER_URL } = {}) => {
  assertAllowedUrl(serverUrl, "Bot の接続先");
  /** @type {VerifyBot[]} */
  const bots = [];

  /**
   * ルームへ Bot を参加させ，全員の参加確認まで待つ
   * @param {{ roomId: string, count?: number, namePrefix?: string, canMove?: boolean, timeoutMs?: number }} params
   * @returns {Promise<VerifyBot[]>}
   */
  const join = async ({
    roomId,
    count = 3,
    namePrefix = "verify-bot",
    canMove = true,
    timeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
  }) => {
    if (!namePrefix.startsWith("verify-")) {
      throw new Error(`Bot の名前は verify- で始めてください: ${namePrefix}`);
    }
    const joined = [];
    for (let index = 0; index < count; index += 1) {
      const bot = createBot({
        roomId,
        name: `${namePrefix}-${bots.length + 1}`,
        canMove,
        serverUrl,
      });
      bots.push(bot);
      joined.push(bot);
      // サーバーの参加処理を順序どおりにするため 1 体ずつ確定させる
      await bot.waitFor(
        (state) => state.isJoined || state.rejectedReason !== null,
        { timeoutMs, description: `ルーム ${roomId} への参加` },
      );
      if (bot.state.rejectedReason !== null) {
        throw new Error(`${bot.name} の参加が拒否されました（reason: ${bot.state.rejectedReason}）`);
      }
    }
    return joined;
  };

  /** 全 Bot を切断する（成否に関わらずランナーが呼ぶ） */
  const disconnectAll = () => {
    for (const bot of bots) {
      bot.disconnect();
    }
  };

  /** 結果出力用の要約 */
  const summarize = () =>
    bots.map((bot) => ({
      name: bot.name,
      id: bot.state.id,
      isJoined: bot.state.isJoined,
      rejectedReason: bot.state.rejectedReason,
      teamId: bot.state.teamId,
      isGameStarted: bot.state.isGameStarted,
      isGameEnded: bot.state.isGameEnded,
      moveCount: bot.state.moveCount,
      hasResult: bot.state.result !== null,
      errors: bot.state.errors,
    }));

  return { join, disconnectAll, summarize, list: () => [...bots] };
};
