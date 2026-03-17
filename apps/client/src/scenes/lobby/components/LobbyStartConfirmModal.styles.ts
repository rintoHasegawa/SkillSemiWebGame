/**
 * LobbyStartConfirmModal.styles
 * ゲームスタート確認モーダルのスタイル定数を定義する
 */
import type { CSSProperties } from "react";
import {
  OVERLAY_PANEL_BASE_STYLE,
  OVERLAY_PANEL_FOOTER_BASE_STYLE,
  OVERLAY_PANEL_HEADER_BASE_STYLE,
} from "@client/scenes/shared/styles/overlayStyles";

/** オーバーレイ背景のスタイル */
export const LOBBY_START_CONFIRM_OVERLAY_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.72)",
  zIndex: 120,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
};

/** 確認パネルのスタイル */
export const LOBBY_START_CONFIRM_PANEL_STYLE: CSSProperties = {
  ...OVERLAY_PANEL_BASE_STYLE,
  width: "min(360px, 100%)",
  display: "flex",
  flexDirection: "column",
};

/** 確認パネルヘッダーのスタイル */
export const LOBBY_START_CONFIRM_HEADER_STYLE: CSSProperties = {
  ...OVERLAY_PANEL_HEADER_BASE_STYLE,
  fontSize: "1.1rem",
  fontWeight: 800,
};

/** 確認パネル本文のスタイル */
export const LOBBY_START_CONFIRM_BODY_STYLE: CSSProperties = {
  padding: "20px 18px",
  fontSize: "1rem",
  lineHeight: 1.6,
  color: "rgba(255, 255, 255, 0.85)",
};

/** 確認パネルフッターのスタイル */
export const LOBBY_START_CONFIRM_FOOTER_STYLE: CSSProperties = {
  ...OVERLAY_PANEL_FOOTER_BASE_STYLE,
  display: "flex",
  gap: "10px",
  justifyContent: "flex-end",
};

/** 「はい」ボタンのスタイル */
export const LOBBY_START_CONFIRM_YES_BUTTON_STYLE: CSSProperties = {
  padding: "10px 24px",
  fontSize: "0.95rem",
  cursor: "pointer",
  borderRadius: "8px",
  border: "none",
  background: "#4ade80",
  color: "#111",
  fontWeight: 700,
};
