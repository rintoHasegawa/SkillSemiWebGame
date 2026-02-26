/**
 * GameView.styles
 * GameView の描画スタイル定数を集約する
 * 画面全体レイアウトとオーバーレイ表示の見た目を定義する
 */
import type { CSSProperties } from "react";

/** ゲーム画面全体のルートスタイル */
export const ROOT_STYLE: CSSProperties = {
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  position: "relative",
  backgroundColor: "#000",
  userSelect: "none",
  WebkitUserSelect: "none",
};

/** 上部中央のタイマー表示スタイル */
export const TIMER_STYLE: CSSProperties = {
  position: "absolute",
  top: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10,
  color: "white",
  fontSize: "32px",
  fontWeight: "bold",
  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
  fontFamily: "monospace",
  userSelect: "none",
  WebkitUserSelect: "none",
};

/** Pixi描画レイヤーの配置スタイル */
export const PIXI_LAYER_STYLE: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  zIndex: 1,
};

/** 画面中央の開始カウントダウン表示スタイル */
export const START_COUNTDOWN_STYLE: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 30,
  color: "white",
  fontSize: "clamp(3rem, 14vw, 8rem)",
  fontWeight: 900,
  textShadow: "0 0 16px rgba(0,0,0,0.85)",
  fontFamily: "monospace",
  userSelect: "none",
  WebkitUserSelect: "none",
  pointerEvents: "none",
};