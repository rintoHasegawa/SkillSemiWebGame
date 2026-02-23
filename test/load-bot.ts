import { io } from "socket.io-client";
import {
  BOTS,
  DURATION_MS,
  JOIN_DELAY_MS,
  MAX_X,
  MAX_Y,
  MOVE_INTERVAL_MS,
  ROOM_ID,
  SOCKET_PATH,
  SOCKET_TRANSPORTS,
  START_DELAY_MS,
  START_GAME,
  URL,
} from "./load-bot.constants.js";

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

// 実行後の簡易サマリ用カウンタ。
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
// 既にオーナーがいるルームを追跡。

console.log("Load test starting...", {
  url: URL,
  bots: BOTS,
  roomId: ROOM_ID,
  durationMs: DURATION_MS,
  joinDelayMs: JOIN_DELAY_MS,
  startGame: START_GAME,
  startDelayMs: START_DELAY_MS,
  moveIntervalMs: MOVE_INTERVAL_MS,
  maxX: MAX_X,
  maxY: MAX_Y,
});

// 接続スパイクを避けるため参加タイミングを分散。
for (let i = 0; i < BOTS; i += 1) {
  const delay = i * JOIN_DELAY_MS;
  setTimeout(() => {
    const bot = createBot(i, stats);
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
}, DURATION_MS);

function createBot(index: number, counters: Stats): Bot {
  const roomId = ROOM_ID;
  const playerName = `bot-${index}`;
  const isOwner = index === 0;

  // 固定トランスポートで再接続なしのクライアント接続。
  const socket = io(URL, {
    transports: SOCKET_TRANSPORTS,
    path: SOCKET_PATH,
    reconnection: false,
    timeout: 10_000,
  });

  let moveTimer: NodeJS.Timeout | null = null;

  socket.on("connect", () => {
    counters.connected += 1;
    // 接続直後にルームへ参加。
    socket.emit("join-room", { roomId, playerName });
    counters.joined += 1;

    if (START_GAME && isOwner) {
      // 他ボットの参加を待つため開始を少し遅らせる。
      setTimeout(() => {
        socket.emit("start-game");
        counters.startSent += 1;
      }, START_DELAY_MS);
    }
  });

  socket.on("game-start", () => {
    counters.gameStarts += 1;
    // ゲーム開始後に定期的な移動イベントを送信。
    if (!moveTimer && MOVE_INTERVAL_MS > 0) {
      moveTimer = setInterval(() => {
        const x = Math.random() * MAX_X;
        const y = Math.random() * MAX_Y;
        socket.emit("move", { x, y });
        counters.moveSent += 1;
      }, MOVE_INTERVAL_MS);
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
