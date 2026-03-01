/**
 * index
 * gridMap サブドメインの公開要素を集約して再公開する
 * 型定義と座標変換ロジックを外部利用向けに束ねる
 */

/** グリッドマップ関連の型を再公開する */
export type { MapState, CellUpdate } from "./gridMap.type";
/** グリッド座標変換ロジックを再公開する */
export { getGridIndexFromPosition } from "./gridMap.logic";
