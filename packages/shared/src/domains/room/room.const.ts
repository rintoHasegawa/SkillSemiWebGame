import type { AppState as AppStateType, RoomStatus as RoomStatusType } from "./room.type";

// クライアント画面遷移利用アプリ状態の値
export const AppState = {
  TITLE: "title",
  LOBBY: "lobby",
  PLAYING: "playing",
} as const satisfies Record<string, AppStateType>;

// ルーム進行フェーズ状態の値
export const RoomStatus = {
  WAITING: "waiting",
  PLAYING: "playing",
  RESULT: "result",
} as const satisfies Record<string, RoomStatusType>;
