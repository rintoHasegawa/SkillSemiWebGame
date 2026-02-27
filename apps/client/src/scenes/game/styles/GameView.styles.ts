/**
 * GameView.styles
 * GameView の描画スタイル定数を集約する
 * 画面全体レイアウトとオーバーレイ表示の見た目を定義する
 */
import type { CSSProperties } from "react";

/** ゲーム画面全体のルートスタイル */
export const GAME_VIEW_ROOT_STYLE: CSSProperties = {
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  position: "relative",
  backgroundColor: "#000",
  userSelect: "none",
  WebkitUserSelect: "none",
};

/** 上部中央のタイマー表示スタイル */
export const GAME_VIEW_TIMER_STYLE: CSSProperties = {
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

/** 右上のチーム塗り率パネルスタイル */
export const GAME_VIEW_PAINT_RATE_PANEL_STYLE: CSSProperties = {
  position: "absolute",
  top: "20px",
  right: "16px",
  zIndex: 12,
  color: "white",
  fontSize: "14px",
  fontWeight: 700,
  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
  fontFamily: "monospace",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  userSelect: "none",
  WebkitUserSelect: "none",
  pointerEvents: "none",
};

/** チーム塗り率1行のスタイル */
export const GAME_VIEW_PAINT_RATE_ITEM_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "4px",
};

/** チーム色四角マーカーのスタイル */
export const GAME_VIEW_PAINT_RATE_SQUARE_STYLE: CSSProperties = {
  lineHeight: 1,
  fontSize: "14px",
};

/** Pixi描画レイヤーの配置スタイル */
export const GAME_VIEW_PIXI_LAYER_STYLE: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  zIndex: 1,
};

/** 画面中央の開始カウントダウン表示スタイル */
export const GAME_VIEW_START_COUNTDOWN_STYLE: CSSProperties = {
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

/** 画面中央のフィーバー表示スタイル */
export const GAME_VIEW_FEVER_TEXT_STYLE: CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 31,
  color: "#fff27a",
  fontSize: "clamp(1.4rem, 7vw, 3.6rem)",
  fontWeight: 1000,
  letterSpacing: "0.08em",
  WebkitTextStroke: "2px rgba(120, 0, 0, 0.9)",
  textShadow:
    "0 0 6px rgba(255,255,255,0.9), 0 0 18px rgba(255,214,10,0.95), 0 0 32px rgba(255,120,0,0.85), 0 0 48px rgba(255,0,0,0.75)",
  fontFamily: "monospace",
  whiteSpace: "nowrap",
  userSelect: "none",
  WebkitUserSelect: "none",
  pointerEvents: "none",
  animation: "feverPulse 0.9s ease-in-out infinite",
};
