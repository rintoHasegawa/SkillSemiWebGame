/**
 * index
 * gridMap サブドメインの公開要素を集約して再公開する
 * 型定義と座標変換ロジックを外部利用向けに束ねる
 */

/** グリッドマップ関連の型を再公開する */
export type { MapState, CellUpdate, GroupedCellUpdates } from "./gridMap.type";
/** グリッド座標変換ロジックを再公開する */
export {
	getGridIndexFromPosition,
	getGridIndexFromPositionWithSize,
} from "./gridMap.logic";
/** CellUpdate配列とGroupedCellUpdatesの相互変換を再公開する */
export { groupCellUpdates, ungroupCellUpdates } from "./groupedCellUpdates";
