/**
 * JoystickView
 * ジョイスティックの見た目だけを描画するコンポーネント
 * 入力処理は持たず，受け取った座標情報をもとにUIを描く
 */
import type { Point } from "./joystick.types";

/** 表示に必要な座標と状態 */
type Props = {
  isActive: boolean;
  center: Point;
  knobOffset: Point;
  radius: number;
};

/** UIの見た目だけを描画するビュー */
export const JoystickView = ({ isActive, center, knobOffset, radius }: Props) => {
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
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: "50%",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 40,
          height: 40,
          background: "rgba(255, 255, 255, 0.8)",
          borderRadius: "50%",
          transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
          boxShadow: "0 0 10px rgba(0,0,0,0.5)",
        }}
      />
    </div>
  );
};
