/**
 * bombHit.logic
 * 爆弾とプレイヤーの円当たり判定を行う純関数を提供する
 * 同チーム無効判定と二乗距離比較をまとめて扱う
 */
import type { BombHitCheckInput, BombHitCheckResult } from "./bombHit.type";

/** 爆弾とプレイヤーの当たり判定を実行する */
export const checkBombHit = ({
  bomb,
  player,
}: BombHitCheckInput): BombHitCheckResult => {
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
