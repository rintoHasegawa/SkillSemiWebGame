/**
 * bombHit.type
 * 爆弾当たり判定で利用する共有型を定義する
 * 円同士の衝突判定とチーム判定に必要な型を提供する
 */

/** 円当たり判定に利用する座標と半径の基本型 */
export type CollisionCircle = {
  x: number;
  y: number;
  radius: number;
};

/** チーム判定を伴う円当たり判定の入力型 */
export type TeamCollisionCircle = CollisionCircle & {
  teamId: number;
};

/** 爆弾当たり判定の入力型 */
export type BombHitCheckInput = {
  bomb: TeamCollisionCircle;
  player: TeamCollisionCircle;
};

/** 爆弾当たり判定の結果型 */
export type BombHitCheckResult = {
  isHit: boolean;
  isSameTeam: boolean;
  distanceSquared: number;
  thresholdSquared: number;
};
