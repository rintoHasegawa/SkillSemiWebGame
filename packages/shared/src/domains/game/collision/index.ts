/**
 * index
 * collision サブドメインの公開要素を集約して再公開する
 * 円当たり判定の型とロジックを外部利用向けに束ねる
 */

/** 円当たり判定の型を再公開する */
export type {
  CollisionCircle,
  CircleOverlapInput,
  CircleOverlapResult,
} from "./collision.type";

/** 円同士の重なり判定ロジックを再公開する */
export { checkCircleOverlap } from "./collision.logic";
