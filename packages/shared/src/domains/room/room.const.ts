/**
 * room.const
 * ルーム領域で利用する定数を定義する
 * 進行フェーズ値を外部利用向けに提供する
 */
import type { RoomPhase as RoomPhaseType } from "./room.type";

/** ルーム進行フェーズで利用する定数 */
export const RoomPhase = {
  WAITING: "waiting",
  PLAYING: "playing",
  RESULT: "result",
} as const satisfies Record<string, RoomPhaseType>;
