/**
 * MiniMapPanel.styles
 * ミニマップパネルの描画スタイルを集約する
 * トグルボタンとマップ表示の見た目を定義する
 */
import type { CSSProperties } from "react";
import { MINIMAP_UI_CONFIG } from "./minimapUiConfig";

/** ミニマップコンテナのスタイル */
export const MINIMAP_PANEL_ROOT_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "8px",
  pointerEvents: "auto",
};

/** ミニマップ開閉ボタンのスタイルを返す */
export const buildMiniMapToggleButtonStyle = (
  isOpen: boolean,
): CSSProperties => ({
  minWidth: `${MINIMAP_UI_CONFIG.BUTTON_MIN_WIDTH_PX}px`,
  height: `${MINIMAP_UI_CONFIG.BUTTON_HEIGHT_PX}px`,
  padding: "0 10px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.55)",
  background: isOpen ? "rgba(55, 18, 18, 0.82)" : "rgba(14, 14, 14, 0.82)",
  color: "#ffffff",
  fontFamily: "monospace",
  fontWeight: 800,
  fontSize: "12px",
  cursor: "pointer",
  textShadow: "1px 1px 2px rgba(0,0,0,0.65)",
});

/** ミニマップ表示領域のスタイル */
export const MINIMAP_FRAME_STYLE: CSSProperties = {
  position: "relative",
  width: `${MINIMAP_UI_CONFIG.FRAME_SIZE_PX}px`,
  height: `${MINIMAP_UI_CONFIG.FRAME_SIZE_PX}px`,
  border: `2px solid ${MINIMAP_UI_CONFIG.FRAME_BORDER_COLOR}`,
  borderRadius: `${MINIMAP_UI_CONFIG.FRAME_BORDER_RADIUS_PX}px`,
  background: MINIMAP_UI_CONFIG.FRAME_BACKGROUND_GRADIENT,
  boxShadow: "0 0 8px rgba(0,0,0,0.45)",
  overflow: "hidden",
  opacity: MINIMAP_UI_CONFIG.FRAME_OPACITY,
};

/** ミニマップ描画キャンバスのスタイル */
export const MINIMAP_CANVAS_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  imageRendering: "pixelated",
};

/** ミニマップ内の現在地ドットスタイルを返す */
export const buildMiniMapDotStyle = (
  leftPx: number,
  topPx: number,
): CSSProperties => ({
  position: "absolute",
  left: `${leftPx}px`,
  top: `${topPx}px`,
  width: `${MINIMAP_UI_CONFIG.DOT_SIZE_PX}px`,
  height: `${MINIMAP_UI_CONFIG.DOT_SIZE_PX}px`,
  borderRadius: "50%",
  border: "2px solid rgba(0,0,0,0.7)",
  background: "#ffffff",
  boxShadow: "0 0 6px rgba(255,255,255,0.8)",
  transform: "translate(-50%, -50%)",
});
