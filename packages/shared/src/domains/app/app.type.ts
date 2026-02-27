/**
 * app.type
 * アプリ状態領域で利用する共有型を定義する
 * 画面遷移フェーズ契約を外部参照向けに提供する
 */

/** クライアント画面遷移で利用するフェーズ型 */
export type ScenePhase = "title" | "lobby" | "playing" | "result";
