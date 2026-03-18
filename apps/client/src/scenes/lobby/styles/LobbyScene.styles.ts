/**
 * LobbyScene.styles
 * LobbyScene の描画スタイル定数を集約する
 */
import type { CSSProperties } from "react";
import { safeLeft, safeRight, safeTop } from "@client/styles/safeArea";

/** 背景アニメーション画像レイヤーのスタイル */
export const LOBBY_BACKGROUND_STYLE: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100dvh",
  backgroundImage: "url('/LobbyAni2.webp')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  zIndex: 0,
  pointerEvents: "none",
  filter: "brightness(0.4)",
};

/** メインコンテナのスタイル */
export const LOBBY_CONTAINER_STYLE: CSSProperties = {
  position: "fixed",
  inset: 0,
  padding: "20px",
  color: "white",
  background: "transparent",
  height: "100dvh",
  width: "100vw",
  overflowX: "hidden",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
  touchAction: "pan-y",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  zIndex: 1,
};

/** タイトルへ戻るボタンのスタイル */
export const LOBBY_BACK_BUTTON_STYLE: CSSProperties = {
  position: "absolute",
  top: safeTop(20),
  left: safeLeft(20),
};

/** 歯車（設定）ボタンのスタイル */
export const LOBBY_SETTINGS_GEAR_BUTTON_STYLE: CSSProperties = {
  position: "absolute",
  top: safeTop(16),
  right: safeRight(16),
  width: "42px",
  height: "42px",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,0.35)",
  background: "rgba(0,0,0,0.55)",
  color: "white",
  cursor: "pointer",
  backdropFilter: "blur(6px)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
  transition: "background 0.2s, transform 0.2s",
};

/** ルームタイトルのスタイル */
export const LOBBY_TITLE_STYLE: CSSProperties = {
  fontSize: "clamp(1.5rem, 4vw, 2rem)",
  margin: "0 0 15px 0",
  textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
};

/** 左パネルのスタイル */
export const LOBBY_LEFT_PANEL_STYLE: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  padding: "4px 10px 10px",
};

/** 左パネル内コントロール群ラッパーのスタイル */
export const LOBBY_LEFT_INNER_STYLE: CSSProperties = {
  width: "100%",
  flexGrow: 1,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "flex-start",
  paddingTop: "2px",
};

/** オーナー・非オーナー共通のコントロールブロックのスタイル */
export const LOBBY_CONTROLS_BLOCK_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: "350px",
  display: "flex",
  flexDirection: "column",
  gap: "clamp(6px, 1.5dvh, 12px)",
};

/** セレクトラベルのスタイル */
export const LOBBY_LABEL_STYLE: CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 700,
  textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
};

/** セレクトボックスのスタイル */
export const LOBBY_SELECT_STYLE: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.4)",
  background: "rgba(0,0,0,0.55)",
  color: "white",
  fontSize: "1rem",
  fontWeight: 700,
};

/** ゲームスタートボタンのスタイル */
export const LOBBY_START_BUTTON_STYLE: CSSProperties = {
  width: "100%",
  padding: "clamp(10px, 2.5dvh, 20px)",
  fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
  cursor: "pointer",
  backgroundColor: "#4ade80",
  color: "#111",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
  marginTop: "clamp(8px, 2dvh, 16px)",
};


/** 非オーナー向けホスト設定表示カードのスタイル */
export const LOBBY_HOST_SETTINGS_STYLE: CSSProperties = {
  padding: "12px 16px",
  backgroundColor: "rgba(0,0,0,0.5)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: "8px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

/** 非オーナー向けホスト設定ラベルのスタイル */
export const LOBBY_HOST_SETTINGS_LABEL_STYLE: CSSProperties = {
  fontSize: "0.8rem",
  color: "#aaa",
};

/** 非オーナー向けホスト設定値のスタイル */
export const LOBBY_HOST_SETTINGS_VALUE_STYLE: CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 700,
};

/** 非オーナー待機表示のスタイル */
export const LOBBY_WAITING_STYLE: CSSProperties = {
  padding: "clamp(8px, 2dvh, 20px) 16px",
  fontSize: "clamp(0.95rem, 2.5vw, 1.2rem)",
  backgroundColor: "#555",
  color: "#ccc",
  borderRadius: "8px",
  textAlign: "center",
  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
};

/** 右パネル（プレイヤーリスト）のスタイル */
export const LOBBY_PLAYER_LIST_PANEL_STYLE: CSSProperties = {
  flex: 1,
  minWidth: 0,
  background: "rgba(0, 0, 0, 0.6)",
  padding: "20px",
  borderRadius: "8px",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
};

/** プレイヤーリストヘッダーのスタイル */
export const LOBBY_PLAYER_LIST_HEADER_STYLE: CSSProperties = {
  borderBottom: "1px solid #555",
  paddingBottom: "10px",
  margin: "0 0 10px 0",
  fontSize: "clamp(1rem, 3vw, 1.2rem)",
};

/** プレイヤーリスト1行のスタイル */
export const LOBBY_PLAYER_LIST_ITEM_STYLE: CSSProperties = {
  margin: "10px 0",
  display: "flex",
  alignItems: "center",
  gap: "10px",
};
