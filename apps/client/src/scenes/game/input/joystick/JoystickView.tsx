/**
 * JoystickView
 * ジョイスティックの見た目だけを描画するコンポーネント
 * 入力処理は持たず，受け取った座標情報をもとにUIを描く
 */
import {
  JOYSTICK_BASE_BG_COLOR,
  JOYSTICK_BASE_BORDER_COLOR,
  JOYSTICK_BASE_BORDER_WIDTH,
  JOYSTICK_KNOB_BG_COLOR,
  JOYSTICK_KNOB_SHADOW,
  JOYSTICK_KNOB_SIZE,
} from "./common";
import type { UseJoystickViewProps } from "./common";

/** UIの見た目だけを描画するビュー */
export const JoystickView = ({ isActive, center, knobOffset, radius }: UseJoystickViewProps) => {
  if (!isActive) return null;

  // ベースリングとノブの描画
  return (
    <div
      style={{
        position: "fixed",
        left: center.x - radius,
        top: center.y - radius,
        width: radius * 2,
        height: radius * 2,
        background: JOYSTICK_BASE_BG_COLOR,
        borderRadius: "50%",
        border: `${JOYSTICK_BASE_BORDER_WIDTH}px solid ${JOYSTICK_BASE_BORDER_COLOR}`,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: JOYSTICK_KNOB_SIZE,
          height: JOYSTICK_KNOB_SIZE,
          background: JOYSTICK_KNOB_BG_COLOR,
          borderRadius: "50%",
          transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
          boxShadow: JOYSTICK_KNOB_SHADOW,
        }}
      />
    </div>
  );
};
