/**
 * logEvent
 * 共通ログ出力で利用するイベントログ関数を提供する
 */
type LogEventPayload = {
  event: string;
  result: string;
  socketId?: string;
  roomId?: string;
  [key: string]: unknown;
};

/** スコープ名とイベント情報を標準出力へ記録する */
export const logEvent = (scope: string, payload: LogEventPayload) => {
  console.log(`[${scope}]`, payload);
};
