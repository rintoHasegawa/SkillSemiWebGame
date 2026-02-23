import { io } from "socket.io-client";
import { config } from "@repo/shared";

const { GAME_CONFIG, NETWORK_CONFIG } = config;

const DEFAULT_URL = NETWORK_CONFIG.PROD_SERVER_URL;
const DEFAULT_BOTS = 20;
const DEFAULT_ROOMS = 1;
const DEFAULT_DURATION_MS = 60_000;
const DEFAULT_JOIN_DELAY_MS = 25;
const DEFAULT_MOVE_INTERVAL_MS = 200;
const DEFAULT_START_DELAY_MS = 800;
const DEFAULT_MAX_X = GAME_CONFIG.MAP_WIDTH;
const DEFAULT_MAX_Y = GAME_CONFIG.MAP_HEIGHT;

const SOCKET_PATH = NETWORK_CONFIG.SOCKET_IO_PATH;
const SOCKET_TRANSPORTS = NETWORK_CONFIG.SOCKET_TRANSPORTS;

// CLI引数を先に解析して、環境変数やデフォルトを上書きできるようにする。
const args = parseArgs(process.argv.slice(2));

// 実行時オプションを集約（CLI > 環境変数 > デフォルト）。
const options = {
  url: args.url ?? process.env.TARGET_URL ?? DEFAULT_URL,
  bots: toInt(args.bots ?? process.env.BOTS, DEFAULT_BOTS),
  rooms: toInt(args.rooms ?? process.env.ROOMS, DEFAULT_ROOMS),
  roomPrefix: args.roomPrefix ?? process.env.ROOM_PREFIX ?? "load-room",
  durationMs: toInt(args.durationMs ?? process.env.DURATION_MS, DEFAULT_DURATION_MS),
  joinDelayMs: toInt(args.joinDelayMs ?? process.env.JOIN_DELAY_MS, DEFAULT_JOIN_DELAY_MS),
  startGame: toBool(args.startGame ?? process.env.START_GAME ?? "1"),
  startDelayMs: toInt(args.startDelayMs ?? process.env.START_DELAY_MS, DEFAULT_START_DELAY_MS),
  moveIntervalMs: toInt(args.moveIntervalMs ?? process.env.MOVE_INTERVAL_MS, DEFAULT_MOVE_INTERVAL_MS),
  maxX: toInt(args.maxX ?? process.env.MAX_X, DEFAULT_MAX_X),
  maxY: toInt(args.maxY ?? process.env.MAX_Y, DEFAULT_MAX_Y),
};

// 実行後の簡易サマリ用カウンタ。
const stats = {
  connected: 0,
  joined: 0,
  startSent: 0,
  moveSent: 0,
  disconnects: 0,
  errors: 0,
  gameStarts: 0,
};

const bots = [];
// 既にオーナーがいるルームを追跡。
const perRoomOwnerIndex = new Set();

console.log("Load test starting...", options);

// 接続スパイクを避けるため参加タイミングを分散。
for (let i = 0; i < options.bots; i += 1) {
  const delay = i * options.joinDelayMs;
  setTimeout(() => {
    const bot = createBot(i, options, perRoomOwnerIndex, stats);
    bots.push(bot);
  }, delay);
}

// 指定時間後に全ボットを停止。
setTimeout(() => {
  console.log("Stopping bots...");
  for (const bot of bots) {
    bot.stop();
  }
  setTimeout(() => {
    console.log("Final stats:", stats);
    process.exit(0);
  }, 500);
}, options.durationMs);

function createBot(index, opts, owners, counters) {
  // ルームへラウンドロビンで分散。
  const roomIndex = index % opts.rooms;
  const roomId = `${opts.roomPrefix}-${roomIndex}`;
  const playerName = `bot-${index}`;
  // 各ルームの先頭ボットをオーナー扱いにする。
  const isOwner = index < opts.rooms;

  if (isOwner) {
    owners.add(roomIndex);
  }

  // 固定トランスポートで再接続なしのクライアント接続。
  const socket = io(opts.url, {
    transports: SOCKET_TRANSPORTS,
    path: SOCKET_PATH,
    reconnection: false,
    timeout: 10_000,
  });

  let moveTimer = null;

  socket.on("connect", () => {
    counters.connected += 1;
    // 接続直後にルームへ参加。
    socket.emit("join-room", { roomId, playerName });
    counters.joined += 1;

    if (opts.startGame && isOwner) {
      // 他ボットの参加を待つため開始を少し遅らせる。
      setTimeout(() => {
        socket.emit("start-game");
        counters.startSent += 1;
      }, opts.startDelayMs);
    }
  });

  socket.on("game-start", () => {
    counters.gameStarts += 1;
    // ゲーム開始後に定期的な移動イベントを送信。
    if (!moveTimer && opts.moveIntervalMs > 0) {
      moveTimer = setInterval(() => {
        const x = Math.random() * opts.maxX;
        const y = Math.random() * opts.maxY;
        socket.emit("move", { x, y });
        counters.moveSent += 1;
      }, opts.moveIntervalMs);
    }
  });

  socket.on("disconnect", () => {
    counters.disconnects += 1;
    if (moveTimer) {
      clearInterval(moveTimer);
      moveTimer = null;
    }
  });

  socket.on("connect_error", () => {
    counters.errors += 1;
  });

  return {
    stop() {
      if (moveTimer) {
        clearInterval(moveTimer);
        moveTimer = null;
      }
      socket.disconnect();
    },
  };
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;

    const [rawKey, inlineValue] = current.slice(2).split("=");
    const key = toCamel(rawKey);

    if (inlineValue !== undefined) {
      result[key] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      i += 1;
    } else {
      result[key] = "true";
    }
  }
  return result;
}

// CLIのkebab-caseをcamelCaseに変換。
function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

// 整数の安全なパース（失敗時はフォールバック）。
function toInt(value, fallback) {
  const num = Number.parseInt(String(value), 10);
  return Number.isFinite(num) ? num : fallback;
}

// フラグの真値として一般的な文字列を許可。
function toBool(value) {
  if (value === true) return true;
  if (value === false) return false;
  const normalized = String(value).toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}
