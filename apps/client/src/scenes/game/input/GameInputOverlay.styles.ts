/**
 * GameInputOverlay.styles
 * GameInputOverlayのレイヤースタイルを集約する
 * 入力UI全体の配置スタイルを提供する
 */
import type { CSSProperties } from "react";

/** 入力UI全体レイヤーの固定スタイル */
export const GAME_INPUT_OVERLAY_LAYER_STYLE: CSSProperties = {
  position: "absolute",
  zIndex: 20,
  width: "100%",
  height: "100%",
};

/** 入力UI全体レイヤーの描画スタイルを返す */
export const buildGameInputOverlayLayerStyle = (): CSSProperties => {
  return {
    ...GAME_INPUT_OVERLAY_LAYER_STYLE,
  };
};
