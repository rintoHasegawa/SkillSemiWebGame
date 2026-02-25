/**
 * scopes
 * ログ出力で利用するスコープ名定数と型を提供する
 */

/** ログ出力で利用するスコープ名の共通定数 */
export const logScopes = {
  NETWORK: "Network",
  GAME_USE_CASE: "GameUseCase",
  ROOM_USE_CASE: "RoomUseCase",
  GAME_LOOP: "GameLoop",
  GAME_ROOM_SESSION: "GameRoomSession",
  GAME_PLAYER_OPERATION_SERVICE: "GamePlayerOperationService",
  GAME_SESSION_LIFECYCLE_SERVICE: "GameSessionLifecycleService",
  ROOM_JOIN_SERVICE: "RoomJoinService",
  ROOM_EXIT_SERVICE: "RoomExitService",
} as const;

/** ログ出力で利用するスコープ名型 */
export type LogScope = (typeof logScopes)[keyof typeof logScopes];
