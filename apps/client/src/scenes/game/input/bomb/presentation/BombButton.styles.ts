/**
 * BombButton.styles
 * BombButtonの描画スタイルを集約する
 * 固定スタイルと動的スタイル生成関数を提供する
 */
import type { CSSProperties } from "react";

/** 爆弾ボタン外枠の固定スタイル */
export const BOMB_BUTTON_FRAME_STYLE: CSSProperties = {
  width: "108px",
  height: "108px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
};

/** 爆弾ボタン入力領域の固定スタイル */
export const BOMB_BUTTON_HIT_AREA_STYLE: CSSProperties = {
  position: "fixed",
  right: "24px",
  bottom: "28px",
  width: "120px",
  height: "120px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  touchAction: "manipulation",
};

/** 爆弾ボタン本体の固定スタイル */
export const BOMB_BUTTON_STYLE: CSSProperties = {
  width: "96px",
  height: "96px",
  borderRadius: "50%",
  border: "2px solid rgba(255,255,255,0.75)",
  background: "rgba(220, 60, 60, 0.85)",
  color: "white",
  fontSize: "18px",
  fontWeight: "bold",
  pointerEvents: "auto",
  touchAction: "manipulation",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** 外枠の進捗表示スタイルを生成する */
export const buildBombButtonFrameStyle = (
  cooldownProgress: number,
): CSSProperties => {
  const progressDeg = Math.max(0, Math.min(1, cooldownProgress)) * 360;
  return {
    ...BOMB_BUTTON_FRAME_STYLE,
    background: `conic-gradient(rgba(255,255,255,0.95) ${progressDeg}deg, rgba(255,255,255,0.2) ${progressDeg}deg 360deg)`,
  };
};

/** ボタン活性状態に応じた本体スタイルを生成する */
export const buildBombButtonStyle = (isReady: boolean): CSSProperties => {
  return {
    ...BOMB_BUTTON_STYLE,
    background: isReady ? "rgba(220, 60, 60, 0.85)" : "rgba(110, 40, 40, 0.85)",
    opacity: isReady ? 1 : 0.88,
    cursor: isReady ? "pointer" : "not-allowed",
  };
};

/** 入力領域の活性状態スタイルを生成する */
export const buildBombButtonHitAreaStyle = (isReady: boolean): CSSProperties => {
  return {
    ...BOMB_BUTTON_HIT_AREA_STYLE,
    cursor: isReady ? "pointer" : "not-allowed",
  };
};
