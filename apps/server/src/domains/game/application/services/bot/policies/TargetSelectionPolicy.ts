/**
 * TargetSelectionPolicy
 * グリッド状況を考慮して次の移動目標セルを選択する
 */
import { config } from "@server/config";
import type { BotTarget } from "../types/BotTypes.js";

type MapGridSize = {
  gridCols: number;
  gridRows: number;
};

const UNPAINTED_TEAM_ID = -1;

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const toGridIndex = (col: number, row: number, cols: number): number => {
  return row * cols + col;
};

const getCellTeamId = (
  gridColors: number[],
  col: number,
  row: number,
  cols: number,
): number => {
  return gridColors[toGridIndex(col, row, cols)] ?? UNPAINTED_TEAM_ID;
};

/** 隣接候補から優先度付きで次の目標セルを選択する */
export const chooseNextTarget = (
  col: number,
  row: number,
  gridColors: number[],
  size: MapGridSize,
): BotTarget => {
  const { UNPAINTED_PRIORITY_STRENGTH } = config.BOT_AI_CONFIG;
  const { gridCols, gridRows } = size;
  const candidates = [
    { col: col + 1, row },
    { col: col - 1, row },
    { col, row: row + 1 },
    { col, row: row - 1 },
  ].filter((candidate) => {
    return (
      candidate.col >= 0 &&
      candidate.col < gridCols &&
      candidate.row >= 0 &&
      candidate.row < gridRows
    );
  });

  if (candidates.length === 0) {
    return { col, row };
  }

  const unpaintedCandidates = candidates.filter((candidate) => {
    return (
      getCellTeamId(gridColors, candidate.col, candidate.row, gridCols) ===
      UNPAINTED_TEAM_ID
    );
  });

  if (
    unpaintedCandidates.length > 0 &&
    Math.random() < clamp(UNPAINTED_PRIORITY_STRENGTH, 0, 1)
  ) {
    return (
      unpaintedCandidates[
        Math.floor(Math.random() * unpaintedCandidates.length)
      ] ?? { col, row }
    );
  }

  return (
    candidates[Math.floor(Math.random() * candidates.length)] ?? { col, row }
  );
};
