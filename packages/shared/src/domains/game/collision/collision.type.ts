/**
 * collision.type
 * 円同士の重なり判定で利用する共有型を定義する
 * チーム概念を持たない当たり判定の入力と結果を提供する
 */

/** 円当たり判定に利用する座標と半径の基本型 */
export type CollisionCircle = {
  x: number;
  y: number;
  radius: number;
};

/** 円同士の重なり判定の入力型 */
export type CircleOverlapInput = {
  circleA: CollisionCircle;
  circleB: CollisionCircle;
};

/** 円同士の重なり判定の結果型 */
export type CircleOverlapResult = {
  isOverlapping: boolean;
  distanceSquared: number;
  thresholdSquared: number;
};
