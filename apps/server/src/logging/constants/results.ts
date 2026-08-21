/**
 * results
 * ログ出力で利用する結果値定数を提供する
 */

/** ログ出力で利用する結果値の共通定数 */
export const logResults = {
  ACCEPTED: "accepted",
  CONNECTED: "connected",
  CREATED: "created",
  DELETED: "deleted",
  DISCONNECTED: "disconnected",
  EMITTED: "emitted",
  IGNORED_ALREADY_PLAYING: "ignored_already_playing",
  IGNORED_ALREADY_RUNNING: "ignored_already_running",
  IGNORED_DUPLICATE: "ignored_duplicate",
  IGNORED_INVALID_PAYLOAD: "ignored_invalid_payload",
  IGNORED_MISSING_ROOM: "ignored_missing_room",
  IGNORED_MISSING_RUNTIME: "ignored_missing_runtime",
  IGNORED_NO_CHANGE: "ignored_no_change",
  IGNORED_NO_ROOM: "ignored_no_room",
  IGNORED_PLAYER_NOT_FOUND: "ignored_player_not_found",
  IGNORED_PLAYER_NOT_IN_SESSION: "ignored_player_not_in_session",
  IGNORED_ROOM_FULL: "ignored_room_full",
  IGNORED_ROOM_NOT_FOUND: "ignored_room_not_found",
  IGNORED_SESSION_NOT_STARTED: "ignored_session_not_started",
  IGNORED_UPDATE_FAILED: "ignored_update_failed",
  JOINED: "joined",
  PLAYER_REMOVED: "player_removed",
  PROCESSED: "processed",
  RECEIVED: "received",
  REJECTED: "rejected",
  REJECTED_DUPLICATE: "rejected_duplicate",
  REJECTED_ROOM_FULL: "rejected_room_full",
  REJECTED_ROOM_PLAYING: "rejected_room_playing",
  REMOVED: "removed",
  SESSION_DISPOSED_EMPTY_ROOM: "session_disposed_empty_room",
  STARTED: "started",
  STATS: "stats",
  STOPPED: "stopped",
  TRANSFERRED: "transferred",
} as const;
