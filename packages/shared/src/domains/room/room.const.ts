/**
 * room.const
 * ルーム領域で利用する定数と派生型を定義する
 * 進行フェーズの単一情報源を提供する
 */

/** ルーム進行フェーズで利用する定数 */
export const RoomPhase = {
  WAITING: "waiting",
  PLAYING: "playing",
  RESULT: "result",
} as const;

/** ルーム進行フェーズで利用する型 */
export type RoomPhase = (typeof RoomPhase)[keyof typeof RoomPhase];
