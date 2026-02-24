/**
 * GameHandler
 * ゲーム関連ハンドラを外部公開する再エクスポート定義
 */
/** ゲームイベント受信ハンドラ登録関数を再公開する */
export { registerGameHandlers } from "./game/registerGameHandlers";
/** ゲーム切断処理ハンドラを再公開する */
export { handleGameDisconnect } from "./game/handleGameDisconnect";
