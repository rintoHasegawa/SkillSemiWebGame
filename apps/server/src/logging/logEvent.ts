/**
 * logEvent
 * 共通ログ出力で利用するイベントログ関数を提供する
 */
import type { LogPayloadByScope, LogScope } from "./logEvents";

type LogEventPayload = {
  socketId?: string;
  roomId?: string;
  [key: string]: unknown;
};

/** スコープ名とイベント情報を標準出力へ記録する */
export const logEvent = <
  TScope extends LogScope,
>(
  scope: TScope,
  payload: LogEventPayload & LogPayloadByScope[TScope]
) => {
  console.log(`[${scope}]`, payload);
};
