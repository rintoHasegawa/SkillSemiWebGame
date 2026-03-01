/**
 * index
 * bombHit サブドメインの公開要素を集約して再公開する
 * 爆弾当たり判定の型とロジックを外部利用向けに束ねる
 */

/** 爆弾当たり判定の型を再公開する */
export type {
  CollisionCircle,
  TeamCollisionCircle,
  BombHitCheckInput,
  BombHitCheckResult,
} from "./bombHit.type";

/** 爆弾当たり判定ロジックを再公開する */
export { checkBombHit } from "./bombHit.logic";
