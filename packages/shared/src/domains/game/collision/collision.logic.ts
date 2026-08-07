/**
 * collision.logic
 * 円同士の重なり判定を行う純関数を提供する
 * チーム概念を持たない二乗距離比較を一元管理する
 */
import type { CircleOverlapInput, CircleOverlapResult } from "./collision.type";

/** 円同士が重なっているかを二乗距離で判定する */
export const checkCircleOverlap = ({
  circleA,
  circleB,
}: CircleOverlapInput): CircleOverlapResult => {
  const deltaX = circleA.x - circleB.x;
  const deltaY = circleA.y - circleB.y;
  const distanceSquared = deltaX * deltaX + deltaY * deltaY;
  const sumRadius = circleA.radius + circleB.radius;
  const thresholdSquared = sumRadius * sumRadius;

  return {
    isOverlapping: distanceSquared < thresholdSquared,
    distanceSquared,
    thresholdSquared,
  };
};
