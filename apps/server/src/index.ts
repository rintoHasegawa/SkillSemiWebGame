import { Server } from "socket.io";
import { createServer } from "http";
import { GameManager } from "./domains/game/GameManager";
import { RoomManager } from "./domains/room/RoomManager";
import { SocketManager } from "./network/SocketManager";
import { config } from "@repo/shared";

// サーバー待受ポート
const PORT = process.env.PORT || config.NETWORK_CONFIG.DEV_SERVER_PORT;

// HTTP サーバー・Socket.io サーバー生成
const httpServer = createServer((req, res) => {
  // Render の HTTP ヘルスチェック向けに 200 を返す
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("not found");
});
const io = new Server(httpServer, {
  cors: {
    // 開発環境向け全オリジン許可設定
    origin: config.NETWORK_CONFIG.CORS_ORIGIN,
    methods: [...config.NETWORK_CONFIG.CORS_METHODS]
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
