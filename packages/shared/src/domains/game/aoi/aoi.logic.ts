/**
 * aoi.logic
 * AOIセル座標とAOI窓の計算ロジックを提供する
 * クライアントとサーバーの可視範囲判定で共通利用する
 */
import { GAME_CONFIG } from "../../../config/gameConfig";

/** AOIセル座標を表す型 */
export type AoiCell = {
  col: number;
  row: number;
};

/** AOI窓の境界を表す型 */
export type AoiWindow = {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
};

/** 座標からAOIセル座標を解決する */
export const resolveAoiCellFromPosition = (
  x: number,
  y: number,
  aoiCellSize: number = GAME_CONFIG.AOI_CELL_SIZE,
): AoiCell => {
  return {
    col: Math.floor(x / aoiCellSize),
    row: Math.floor(y / aoiCellSize),
  };
};

/** AOIセル座標からAOI窓を生成する */
export const resolveAoiWindowFromCell = (
  centerCell: AoiCell,
  windowCols: number = GAME_CONFIG.AOI_WINDOW_COLS,
  windowRows: number = GAME_CONFIG.AOI_WINDOW_ROWS,
): AoiWindow => {
  const halfCols = Math.floor(windowCols / 2);
  const halfRows = Math.floor(windowRows / 2);

  return {
    minCol: centerCell.col - halfCols,
    maxCol: centerCell.col + halfCols,
    minRow: centerCell.row - halfRows,
    maxRow: centerCell.row + halfRows,
  };
};

/** 座標をAOIセルへ変換して指定AOI窓に含まれるか判定する */
export const isPositionInAoiWindow = (
  x: number,
  y: number,
  window: AoiWindow,
  aoiCellSize: number = GAME_CONFIG.AOI_CELL_SIZE,
): boolean => {
  const cell = resolveAoiCellFromPosition(x, y, aoiCellSize);

  return (
    cell.col >= window.minCol
    && cell.col <= window.maxCol
    && cell.row >= window.minRow
    && cell.row <= window.maxRow
  );
};

/** AOIセル座標が同一か判定する */
export const isSameAoiCell = (left: AoiCell, right: AoiCell): boolean => {
  return left.col === right.col && left.row === right.row;
};
