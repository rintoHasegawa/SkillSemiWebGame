/**
 * minimapUiConfig
 * ミニマップUIの見た目定数を集約する
 * サイズや透過度など調整しやすい値を定義する
 */

/** ミニマップUIで利用する見た目定数 */
export const MINIMAP_UI_CONFIG = {
  FRAME_SIZE_PX: 128,
  FRAME_BORDER_RADIUS_PX: 10,
  FRAME_BORDER_COLOR: "rgba(255,255,255,0.65)",
  FRAME_BACKGROUND_GRADIENT:
    "linear-gradient(160deg, rgba(34,34,34,0.5), rgba(12,12,12,0.5))",
  FRAME_OPACITY: 0.82,
  BUTTON_MIN_WIDTH_PX: 84,
  BUTTON_HEIGHT_PX: 32,
  DOT_SIZE_PX: 10,
} as const;
