/**
 * index
 * handlers配下の公開APIを集約して再公開する
 */

/** 接続イベントの共通ハンドラ登録関数を再公開する */
export { registerConnectionHandlers } from "./registerConnectionHandlers";

/** ゲームイベント受信ハンドラ登録関数を再公開する */
export { registerGameHandlers } from "./game/registerGameHandlers";

/** ルームイベント受信ハンドラ登録関数を再公開する */
export { registerRoomHandlers } from "./room/registerRoomHandlers";
