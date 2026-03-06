/**
 * overlayStyles
 * オーバーレイ系UIで再利用する共通スタイルを定義する
 */
import type { CSSProperties } from "react";

/** オーバーレイ面共通トークン */
export const OVERLAY_SURFACE_TOKENS = {
  PANEL_BACKGROUND: "rgba(20, 20, 20, 0.95)",
  PANEL_BORDER: "1px solid rgba(255, 255, 255, 0.15)",
  PANEL_SHADOW: "0 12px 28px rgba(0, 0, 0, 0.45)",
  PANEL_RADIUS: "12px",
  DIVIDER: "1px solid rgba(255, 255, 255, 0.16)",
  HEADER_PADDING: "16px 18px",
  FOOTER_PADDING: "14px 18px",
} as const;

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

/** オーバーレイパネルの共通ベーススタイル */
export const OVERLAY_PANEL_BASE_STYLE: CSSProperties = {
  borderRadius: OVERLAY_SURFACE_TOKENS.PANEL_RADIUS,
  background: OVERLAY_SURFACE_TOKENS.PANEL_BACKGROUND,
  border: OVERLAY_SURFACE_TOKENS.PANEL_BORDER,
  boxShadow: OVERLAY_SURFACE_TOKENS.PANEL_SHADOW,
  color: "white",
};

/** オーバーレイパネルヘッダーの共通ベーススタイル */
export const OVERLAY_PANEL_HEADER_BASE_STYLE: CSSProperties = {
  padding: OVERLAY_SURFACE_TOKENS.HEADER_PADDING,
  borderBottom: OVERLAY_SURFACE_TOKENS.DIVIDER,
};

/** オーバーレイパネルフッターの共通ベーススタイル */
export const OVERLAY_PANEL_FOOTER_BASE_STYLE: CSSProperties = {
  padding: OVERLAY_SURFACE_TOKENS.FOOTER_PADDING,
  borderTop: OVERLAY_SURFACE_TOKENS.DIVIDER,
};
