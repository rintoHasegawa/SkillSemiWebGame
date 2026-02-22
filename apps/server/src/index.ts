import { Server } from "socket.io";
import { createServer } from "http";
import { GameManager } from "./domains/game/GameManager";
import { RoomManager } from "./domains/room/RoomManager";
import { SocketManager } from "./network/SocketManager";

// サーバー待受ポート
const PORT = process.env.PORT || 3000;

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
const roomManager = new RoomManager();
const socketManager = new SocketManager(io, gameManager, roomManager);

socketManager.initialize();

// HTTP サーバー起動
httpServer.listen(PORT, () => {
  console.log(`
  🚀 Server is running on port ${PORT}
  waiting for connections...
  `);
});
