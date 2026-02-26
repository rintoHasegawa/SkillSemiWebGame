/**
 * JoystickInputPresenter.styles
 * JoystickInputPresenterの入力レイヤースタイルを集約する
 * 活性状態に応じたスタイル生成を提供する
 */
import type { CSSProperties } from "react";

/** ジョイスティック入力レイヤーの固定スタイル */
export const JOYSTICK_INPUT_LAYER_STYLE: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "50%",
  height: "100%",
  zIndex: 10,
  touchAction: "none",
};

/** 活性状態に応じた入力レイヤースタイルを生成する */
export const buildJoystickInputLayerStyle = (
  isEnabled: boolean,
): CSSProperties => {
  return {
    ...JOYSTICK_INPUT_LAYER_STYLE,
    pointerEvents: isEnabled ? "auto" : "none",
  };
};
