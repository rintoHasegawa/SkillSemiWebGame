import type { ScenePhase as ScenePhaseType } from "./app.type";

// クライアント画面遷移利用フェーズの値
export const ScenePhase = {
  TITLE: "title",
  LOBBY: "lobby",
  PLAYING: "playing",
  RESULT: "result",
} as const satisfies Record<string, ScenePhaseType>;
