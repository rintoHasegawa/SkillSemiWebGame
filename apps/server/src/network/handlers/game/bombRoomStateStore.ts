/**
 * bombRoomStateStore
 * 爆弾状態管理の互換公開口としてdomains実装を再公開する
 */

/** 爆弾設置イベント配信の重複排除判定関数を再公開する */
export { shouldBroadcastBombPlaced } from "@server/domains/game/entities/bomb/BombRoomStateStore";

/** サーバー採番の爆弾ID生成関数を再公開する */
export { issueServerBombId } from "@server/domains/game/entities/bomb/BombRoomStateStore";

/** ルーム単位の爆弾状態破棄関数を再公開する */
export { clearBombRoomState } from "@server/domains/game/entities/bomb/BombRoomStateStore";
