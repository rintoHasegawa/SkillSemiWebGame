/**
 * RoomHandler
 * ルーム関連ハンドラの公開窓口を提供する再エクスポートファイル
 * ネットワーク層の import 経路を統一する
 */
/** ルームイベント受信ハンドラ登録関数を外部参照向けに再公開 */
export { registerRoomHandlers } from "./room/registerRoomHandlers";
