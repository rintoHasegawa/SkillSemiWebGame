/**
 * app.const
 * アプリ状態領域で利用する定数と派生型を定義する
 * 画面遷移フェーズの単一情報源を提供する
 */

/** クライアント画面遷移で利用するフェーズ定数 */
export const ScenePhase = {
  TITLE: "title",
  LOBBY: "lobby",
  PLAYING: "playing",
  RESULT: "result",
} as const;

/** クライアント画面遷移で利用するフェーズ型 */
export type ScenePhase = (typeof ScenePhase)[keyof typeof ScenePhase];
