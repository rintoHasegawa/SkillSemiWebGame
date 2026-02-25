/**
 * BombRoomStateStore
 * bomb命名互換のためにbomb実装を再公開する
 */

/** 爆弾設置イベント配信の重複排除判定関数を再公開する */
export { shouldBroadcastBombPlaced } from "../bomb/BombRoomStateStore";

/** サーバー採番の爆弾ID生成関数を再公開する */
export { issueServerBombId } from "../bomb/BombRoomStateStore";

/** ルーム単位の爆弾状態破棄関数を再公開する */
export { clearBombRoomState } from "../bomb/BombRoomStateStore";
