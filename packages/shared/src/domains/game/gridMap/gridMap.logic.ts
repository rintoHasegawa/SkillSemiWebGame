import { GAME_CONFIG } from "../../../config/gameConfig";

const toGridIndexWithSize = (
  x: number,
  y: number,
  gridCols: number,
  gridRows: number,
): number | null => {
  const col = Math.floor(x);
  const row = Math.floor(y);

  if (col < 0 || col >= gridCols || row < 0 || row >= gridRows) {
    return null;
  }

  return row * gridCols + col;
};

/** グリッド座標から1次元配列インデックスを取得する（サイズ指定版） */
export function getGridIndexFromPositionWithSize(
  x: number,
  y: number,
  gridCols: number,
  gridRows: number,
): number | null {
  return toGridIndexWithSize(x, y, gridCols, gridRows);
}

/**
 * グリッド座標から1次元配列インデックスを取得する（中心点判定）
 */
export function getGridIndexFromPosition(x: number, y: number): number | null {
  const { GRID_COLS, GRID_ROWS } = GAME_CONFIG;
  return toGridIndexWithSize(x, y, GRID_COLS, GRID_ROWS);
}
