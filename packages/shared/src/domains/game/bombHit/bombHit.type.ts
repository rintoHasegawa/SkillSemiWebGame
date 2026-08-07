/**
 * bombHit.type
 * 爆弾当たり判定で利用する共有型を定義する
 * collision の円型にチーム情報を加えた入力と結果を提供する
 */
import type { CollisionCircle } from "../collision";

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
