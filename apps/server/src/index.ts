/**
 * index
 * サーバー起動時にHTTPサーバー生成とブート処理を実行する
 */
import { createHttpServer } from "./network/bootstrap/createHttpServer";
import { boot } from "./network/bootstrap/boot";
import { config } from "@server/config";

// サーバー待受ポート
const PORT = process.env.PORT || config.NETWORK_CONFIG.DEV_SERVER_PORT;

// HTTP サーバー・Socket.io サーバー生成
const httpServer = createHttpServer();
boot(httpServer);

// HTTP サーバー起動
httpServer.listen(PORT, () => {
  console.log(`
  🚀 Server is running on port ${PORT}
  waiting for connections...
  `);
});
