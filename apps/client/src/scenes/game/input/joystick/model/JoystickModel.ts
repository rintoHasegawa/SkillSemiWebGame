/**
 * JoystickModel
 * ジョイスティック入力の座標計算を担うモデル
 * ノブ表示オフセットと正規化入力ベクトルを算出する
 */
import type { NormalizedInput, Point } from "../common";

/** ジョイスティック計算結果を表す型 */
export type JoystickComputed = {
  knobOffset: Point;
  normalized: NormalizedInput;
};

/** 座標差分からノブオフセットと正規化入力を計算する */
export const computeJoystick = (
  center: Point,
  current: Point,
  radius: number,
): JoystickComputed => {
  const safeRadius = radius > 0 ? radius : 1;

  const dx = current.x - center.x;
  const dy = current.y - center.y;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  const limitedDist = Math.min(dist, safeRadius);
  const offsetX = Math.cos(angle) * limitedDist;
  const offsetY = Math.sin(angle) * limitedDist;

  return {
    knobOffset: { x: offsetX, y: offsetY },
    normalized: {
      x: offsetX / safeRadius,
      y: offsetY / safeRadius,
    },
  };
};
