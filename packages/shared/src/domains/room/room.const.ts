import type { GameState as GameStateType, RoomStatus as RoomStatusType } from "./room.type";

// クライアント画面遷移利用ゲーム状態の値
export const GameState = {
  TITLE: "title",
  LOBBY: "lobby",
  PLAYING: "playing",
} as const satisfies Record<string, GameStateType>;

// ルーム進行フェーズ状態の値
export const RoomStatus = {
  WAITING: "waiting",
  PLAYING: "playing",
  RESULT: "result",
} as const satisfies Record<string, RoomStatusType>;
