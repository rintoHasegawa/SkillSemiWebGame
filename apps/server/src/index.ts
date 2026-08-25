/**
 * index
 * サーバー起動時にHTTPサーバー生成とブート処理を実行する
 */
import { createHttpServer } from "./network/bootstrap/createHttpServer";
import { resolveCorsPolicy } from "./network/bootstrap/corsPolicy";
import { boot } from "./network/bootstrap/boot";
import { config } from "./config";

// サーバー待受ポート
const PORT = process.env.PORT || config.NETWORK_CONFIG.DEV_SERVER_PORT;

// CORS設定を待受開始前に解決し，本番で未設定なら起動を中止する
const corsPolicy = resolveCorsPolicy();

// HTTP サーバー・Socket.io サーバー生成
const httpServer = createHttpServer();
boot(httpServer, corsPolicy);

// HTTP サーバー起動
httpServer.listen(PORT, () => {
  console.log(`
  🚀 Server is running on port ${PORT}
  waiting for connections...
  `);
});
