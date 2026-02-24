import { config } from "@repo/shared";

export const createInitialGridColors = (): number[] => {
  const totalCells = config.GAME_CONFIG.GRID_COLS * config.GAME_CONFIG.GRID_ROWS;
  return new Array(totalCells).fill(-1);
};
