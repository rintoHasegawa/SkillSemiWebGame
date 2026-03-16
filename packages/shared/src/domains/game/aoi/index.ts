/**
 * index
 * AOIサブドメインの公開要素を集約して再公開する
 * 可視範囲計算で利用する型と関数を束ねる
 */

/** AOI関連の型を再公開する */
export type { AoiCell, AoiWindow } from "./aoi.logic";
/** AOI関連の計算関数を再公開する */
export {
  resolveAoiCellFromPosition,
  resolveAoiWindowFromCell,
  isPositionInAoiWindow,
  isSameAoiCell,
} from "./aoi.logic";
