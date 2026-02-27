/**
 * gridMap.type
 * グリッドマップ領域で利用する共有型を定義する
 * マップ状態と差分更新の契約を集約する
 */

/** マップ全体の色状態を保持する構造 */
export interface MapState {
  gridColors: number[];
}

/** マップ1セル分の差分更新情報 */
export interface CellUpdate {
  index: number;
  teamId: number;
}