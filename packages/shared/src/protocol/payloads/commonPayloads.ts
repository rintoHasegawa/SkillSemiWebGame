/**
 * commonPayloads
 * 接続と時刻同期で利用する共通ペイロード型を定義する
 * ソケット通信の基盤イベントで使う契約を集約する
 */

/** PING イベントで送受信する時刻同期リクエスト */
export type PingPayload = number;

/**
 * PONG イベントで送受信する時刻同期レスポンス
 * サーバー側の時刻はすべてゲーム時計基準の経過msで表し，壁時計は含めない
 */
export type PongPayload = {
  /** クライアントが PING で送った単調時計値をそのまま返す */
  clientTime: number;
  /** サーバーが PING を受信した時点のゲーム経過ms（カウントダウン中は負） */
  serverReceivedElapsedMs: number;
  /** サーバーが PONG を送信する時点のゲーム経過ms（カウントダウン中は負） */
  serverSentElapsedMs: number;
};
