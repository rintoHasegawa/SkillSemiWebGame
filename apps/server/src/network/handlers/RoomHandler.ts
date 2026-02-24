/**
 * RoomHandler
 * ルーム関連ハンドラを外部公開する再エクスポート定義
 */
/** ルームイベント受信ハンドラ登録関数を再公開する */
export { registerRoomHandlers } from "./room/registerRoomHandlers";
/** ルーム切断処理ハンドラを再公開する */
export { handleRoomDisconnect } from "./room/handleRoomDisconnect";
