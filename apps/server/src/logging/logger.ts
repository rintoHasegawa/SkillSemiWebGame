/**
 * logger
 * 共通ログ出力で利用するイベントログ関数を提供する
 */
import type { LogPayloadByScope } from "./contracts/payloadByScope";
import type { LogScope } from "./constants/scopes";

type LoggerPayload = {
  socketId?: string;
  roomId?: string;
  [key: string]: unknown;
};

/** スコープ名とイベント情報を標準出力へ記録する */
export const logEvent = <
  TScope extends LogScope,
>(
  scope: TScope,
  payload: LoggerPayload & LogPayloadByScope[TScope]
) => {
  console.log(`[${scope}]`, payload);
};
