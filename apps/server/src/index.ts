import { Server } from "socket.io";
import { createServer } from "http";
import { GameManager } from "./managers/GameManager.js";
import { SocketManager } from "./network/SocketManager.js";

// サーバー待受ポート
const PORT = 3000;

// HTTP サーバー・Socket.io サーバー生成
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    // 開発環境向け全オリジン許可設定
    origin: "*",
    methods: ["GET", "POST"]
  },
});

// ゲーム管理・通信管理クラス初期化
const gameManager = new GameManager();
const socketManager = new SocketManager(io, gameManager);

socketManager.initialize();

// HTTP サーバー起動
httpServer.listen(PORT, () => {
  console.log(`
  🚀 Server is running on port ${PORT}
  waiting for connections...
  `);
});
