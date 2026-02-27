/**
 * overlayStyles
 * オーバーレイ系UIで再利用する共通スタイルを定義する
 */
import type { CSSProperties } from "react";

/** オーバーレイボタンの共通スタイル */
export const OVERLAY_BUTTON_STYLE: CSSProperties = {
  padding: "10px 14px",
  fontSize: "0.95rem",
  cursor: "pointer",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "rgba(0,0,0,0.55)",
  color: "white",
  fontWeight: 700,
};

/** オーバーレイボタン行の共通スタイル */
export const OVERLAY_BUTTON_ROW_STYLE: CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "10px",
};
