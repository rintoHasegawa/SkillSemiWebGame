// src/index.ts
import { Server } from "socket.io";
import { createServer } from "http"; // Node.js標準のHTTPサーバー
import { GameManager } from "./managers/GameManager.js";
import { SocketManager } from "./network/SocketManager.js";

const PORT = 3000;

// HTTPサーバーとSocket.ioサーバーの作成
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // 開発用：どこからでも許可
    methods: ["GET", "POST"]
  },
});

// ゲームマネージャーと通信マネージャーの起動
const gameManager = new GameManager();
const socketManager = new SocketManager(io, gameManager);

socketManager.initialize();

// サーバー起動
httpServer.listen(PORT, () => {
  console.log(`
  🚀 Server is running on port ${PORT}
  waiting for connections...
  `);
});