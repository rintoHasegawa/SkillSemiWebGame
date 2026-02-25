/**
 * GameHandler
 * ゲーム関連ハンドラの公開窓口を提供する再エクスポートファイル
 * ネットワーク層の import 経路を統一する
 */
/** ゲームイベント受信ハンドラ登録関数を外部参照向けに再公開 */
export { registerGameHandlers } from "./game/registerGameHandlers";

/** ルーム終了時の爆弾状態掃除関数を外部参照向けに再公開 */
export { clearBombRoomState } from "./game/registerGameHandlers";
