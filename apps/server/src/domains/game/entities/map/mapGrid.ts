/**
 * mapGrid
 * マップ配列の初期状態を生成する
 */
import { config } from "@server/config";

type MapGridSize = {
  gridCols: number;
  gridRows: number;
};

/** マップ全セルを未塗り状態で初期化した配列を返す */
export const createInitialGridColors = (size?: MapGridSize): number[] => {
  const gridCols = size?.gridCols ?? config.GAME_CONFIG.GRID_COLS;
  const gridRows = size?.gridRows ?? config.GAME_CONFIG.GRID_ROWS;
  const totalCells = gridCols * gridRows;
  return new Array(totalCells).fill(-1);
};
