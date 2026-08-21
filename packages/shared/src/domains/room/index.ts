/**
 * index
 * room ドメインの公開要素を集約して再公開する
 * ルーム状態契約の型・定数と目標人数の判定ロジックを外部利用向けに束ねる
 */

/** ルーム進行フェーズ定数を再公開する */
export { RoomPhase } from "./room.const";
/** ルーム進行フェーズ型を再公開する */
export type { RoomPhase as RoomPhaseType } from "./room.const";
/** 目標人数の刻み幅・下限を再公開する */
export {
  TARGET_PLAYER_COUNT_UNIT,
  MIN_TARGET_PLAYER_COUNT,
} from "./targetPlayerCount";
/** 目標人数の判定・選択肢生成関数を再公開する */
export {
  isTargetPlayerCountUnit,
  isValidTargetPlayerCount,
  resolveMinTargetPlayerCount,
  resolveMaxTargetPlayerCount,
  createTargetPlayerCountOptions,
} from "./targetPlayerCount";
/** ルーム契約関連の型を再公開する */
export type {
  RoomMember,
  Room,
  JoinRoomPayload,
  JoinRoomRejectedReason,
  JoinRoomRejectedPayload,
  TeamAssignmentMode,
} from "./room.type";
