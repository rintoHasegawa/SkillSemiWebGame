/**
 * BombHitDetector
 * 爆弾とプレイヤーの円当たり判定を行う純関数を提供する
 * 同チーム無効判定と二乗距離比較をまとめて扱う
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

/** 爆弾とプレイヤーの当たり判定を実行する */
export const checkBombHit = ({ bomb, player }: BombHitCheckInput): BombHitCheckResult => {
  const isSameTeam = bomb.teamId === player.teamId;
  const deltaX = bomb.x - player.x;
  const deltaY = bomb.y - player.y;
  const distanceSquared = deltaX * deltaX + deltaY * deltaY;
  const sumRadius = bomb.radius + player.radius;
  const thresholdSquared = sumRadius * sumRadius;
  const isHit = !isSameTeam && distanceSquared < thresholdSquared;

  return {
    isHit,
    isSameTeam,
    distanceSquared,
    thresholdSquared,
  };
};
