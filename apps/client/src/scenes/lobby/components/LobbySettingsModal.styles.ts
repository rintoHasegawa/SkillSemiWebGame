/**
 * LobbySettingsModal.styles
 * ゲーム設定モーダルのスタイル定数を定義する
 */
import type { CSSProperties } from "react";
import {
  OVERLAY_PANEL_BASE_STYLE,
  OVERLAY_PANEL_FOOTER_BASE_STYLE,
  OVERLAY_PANEL_HEADER_BASE_STYLE,
} from "@client/scenes/shared/styles/overlayStyles";

/** オーバーレイ背景のスタイル */
export const LOBBY_SETTINGS_MODAL_OVERLAY_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.72)",
  zIndex: 120,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
};

/** 設定パネルのスタイル */
export const LOBBY_SETTINGS_MODAL_PANEL_STYLE: CSSProperties = {
  ...OVERLAY_PANEL_BASE_STYLE,
  width: "min(400px, 100%)",
  display: "flex",
  flexDirection: "column",
};

/** 設定パネルヘッダーのスタイル */
export const LOBBY_SETTINGS_MODAL_HEADER_STYLE: CSSProperties = {
  ...OVERLAY_PANEL_HEADER_BASE_STYLE,
  fontSize: "1.1rem",
  fontWeight: 800,
};

/** 設定パネル本文のスタイル */
export const LOBBY_SETTINGS_MODAL_BODY_STYLE: CSSProperties = {
  padding: "20px 18px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
};

/** 設定パネルフッターのスタイル */
export const LOBBY_SETTINGS_MODAL_FOOTER_STYLE: CSSProperties = {
  ...OVERLAY_PANEL_FOOTER_BASE_STYLE,
  display: "flex",
  justifyContent: "flex-end",
};

/** 設定ラベルのスタイル */
export const LOBBY_SETTINGS_MODAL_LABEL_STYLE: CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "rgba(255, 255, 255, 0.85)",
};

/** 設定セレクトボックスのスタイル */
export const LOBBY_SETTINGS_MODAL_SELECT_STYLE: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.4)",
  background: "rgba(0,0,0,0.55)",
  color: "white",
  fontSize: "1rem",
  fontWeight: 700,
};

/** 設定フィールド（ラベル＋セレクト）のラッパースタイル */
export const LOBBY_SETTINGS_MODAL_FIELD_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};
