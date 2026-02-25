/**
 * commonPayloads
 * 接続と時刻同期で利用する共通ペイロード型を定義する
 * ソケット通信の基盤イベントで使う契約を集約する
 */

/** PING イベントで送受信する時刻同期リクエスト */
export type PingPayload = number;

/** PONG イベントで送受信する時刻同期レスポンス */
export type PongPayload = {
  clientTime: number;
  serverTime: number;
};
