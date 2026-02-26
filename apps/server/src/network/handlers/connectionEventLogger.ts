/**
 * connectionEventLogger
 * 接続ハンドラで利用するログ記録処理を共通化する
 */
import { protocol } from "@repo/shared";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes } from "@server/logging/index";

/** CONNECTイベントの受信ログを記録する */
export const logConnected = (socketId: string): void => {
  logEvent(logScopes.NETWORK, {
    event: protocol.SocketEvents.CONNECT,
    result: logResults.CONNECTED,
    socketId,
  });
};

/** DISCONNECTイベントの受信ログを記録する */
export const logDisconnected = (socketId: string): void => {
  logEvent(logScopes.NETWORK, {
    event: protocol.SocketEvents.DISCONNECT,
    result: logResults.DISCONNECTED,
    socketId,
  });
};
