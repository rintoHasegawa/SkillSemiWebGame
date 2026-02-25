/**
 * mapGrid
 * マップ配列の初期状態を生成する
 */
import { config } from "@repo/shared";

/** マップ全セルを未塗り状態で初期化した配列を返す */
export const createInitialGridColors = (): number[] => {
  const totalCells = config.GAME_CONFIG.GRID_COLS * config.GAME_CONFIG.GRID_ROWS;
  return new Array(totalCells).fill(-1);
};
