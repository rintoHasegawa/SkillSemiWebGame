/**
 * index
 * bombHit サブドメインの公開要素を集約して再公開する
 * 爆弾当たり判定の型とロジックを外部利用向けに束ねる
 */

/** 爆弾当たり判定の型を再公開する */
export type {
  TeamCollisionCircle,
  BombHitCheckInput,
  BombHitCheckResult,
  BombHitReportPoint,
  BombHitReportRangeInput,
} from "./bombHit.type";

/** 爆弾当たり判定ロジックを再公開する */
export { checkBombHit } from "./bombHit.logic";

/** 被弾報告の距離しきい値と距離判定を再公開する */
export {
  BOMB_HIT_REPORT_MAX_DISTANCE_GRID,
  isWithinBombHitReportRange,
} from "./bombHit.logic";
