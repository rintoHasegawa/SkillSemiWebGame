import type { RoomPhase as RoomPhaseType } from "./room.type";

// ルーム進行フェーズ状態の値
export const RoomPhase = {
  WAITING: "waiting",
  PLAYING: "playing",
  RESULT: "result",
} as const satisfies Record<string, RoomPhaseType>;
