/**
 * protocolVersion
 * クライアントとサーバの通信契約バージョンを定義する
 * ハンドシェイク時の照合に用い，版ずれのクライアント接続を検出する
 */

/**
 * クライアントとサーバのプロトコル契約バージョン
 * client/server 間の互換性が壊れる変更（ペイロード形状の変更・イベント廃止等）を
 * 入れたときに数値を 1 つ上げる
 */
export const PROTOCOL_VERSION = "2";

/**
 * バージョン不一致時に接続を拒否する際のエラーメッセージ（クライアントが判別に使う）
 * 文言を変更するとクライアント側の判別が壊れるため固定値として扱う
 */
export const PROTOCOL_VERSION_MISMATCH_ERROR = "protocol-version-mismatch";
