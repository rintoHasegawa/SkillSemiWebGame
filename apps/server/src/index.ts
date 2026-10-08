/**
 * index
 * サーバー起動時にHTTPサーバー生成とブート処理を実行する
 */
import { createHttpServer } from "./network/bootstrap/createHttpServer";
import { resolveCorsPolicy } from "./network/bootstrap/corsPolicy";
import { boot } from "./network/bootstrap/boot";
import { config, gameDurationOverride } from "./config";
import { logEvent } from "./logging/logger";
import {
  logResults,
  logScopes,
  serverConfigLogEvents,
} from "./logging/index";

// サーバー待受ポート
const PORT = process.env.PORT || config.NETWORK_CONFIG.DEV_SERVER_PORT;

// CORS設定を待受開始前に解決し，本番で未設定なら起動を中止する
const corsPolicy = resolveCorsPolicy();

// 試合時間の上書き（開発モード限定）を適用・無視した場合は起動時に記録する
switch (gameDurationOverride.status) {
  case "default":
    // 環境変数が未設定なら上書きは存在しないため記録しない（本番の通常起動ログを増やさない）
    break;
  case "applied":
    logEvent(logScopes.SERVER_CONFIG, {
      event: serverConfigLogEvents.GAME_DURATION_OVERRIDE,
      result: logResults.APPLIED,
      gameDurationSec: gameDurationOverride.gameDurationSec,
    });
    break;
  case "ignored_production":
    logEvent(logScopes.SERVER_CONFIG, {
      event: serverConfigLogEvents.GAME_DURATION_OVERRIDE,
      result: logResults.IGNORED_PRODUCTION,
      gameDurationSec: gameDurationOverride.gameDurationSec,
      rawValue: gameDurationOverride.rawValue,
    });
    break;
  case "ignored_invalid":
    logEvent(logScopes.SERVER_CONFIG, {
      event: serverConfigLogEvents.GAME_DURATION_OVERRIDE,
      result: logResults.IGNORED_INVALID_VALUE,
      gameDurationSec: gameDurationOverride.gameDurationSec,
      rawValue: gameDurationOverride.rawValue,
    });
    break;
}

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
