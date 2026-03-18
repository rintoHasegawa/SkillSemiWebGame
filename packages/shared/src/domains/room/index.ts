/**
 * index
 * room ドメインの公開要素を集約して再公開する
 * ルーム状態契約の型と定数を外部利用向けに束ねる
 */

/** ルーム進行フェーズ定数を再公開する */
export { RoomPhase } from "./room.const";
/** ルーム進行フェーズ型を再公開する */
export type { RoomPhase as RoomPhaseType } from "./room.const";
/** ルーム契約関連の型を再公開する */
export type {
  RoomMember,
  Room,
  JoinRoomPayload,
  JoinRoomRejectedReason,
  JoinRoomRejectedPayload,
  TeamAssignmentMode,
} from "./room.type";
