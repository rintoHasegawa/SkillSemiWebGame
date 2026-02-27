/**
 * app.const
 * アプリ状態領域で利用する定数を定義する
 * 画面遷移フェーズ値を外部利用向けに提供する
 */
import type { ScenePhase as ScenePhaseType } from "./app.type";

/** クライアント画面遷移で利用するフェーズ定数 */
export const ScenePhase = {
  TITLE: "title",
  LOBBY: "lobby",
  PLAYING: "playing",
  RESULT: "result",
} as const satisfies Record<string, ScenePhaseType>;
