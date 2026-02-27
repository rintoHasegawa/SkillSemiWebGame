/**
 * MovePlanner
 * 目標セルに向かう次フレーム座標を計算する
 */
import { config } from "@server/config";

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/** 現在座標から目標セル中心へ向かう次座標を計算する */
export const moveTowardsTarget = (
  x: number,
  y: number,
  targetCol: number,
  targetRow: number,
): { nextX: number; nextY: number } => {
  const targetX = targetCol + 0.5;
  const targetY = targetRow + 0.5;
  const diffX = targetX - x;
  const diffY = targetY - y;
  const distance = Math.hypot(diffX, diffY);

  const maxStep =
    config.GAME_CONFIG.PLAYER_SPEED *
    (config.GAME_CONFIG.PLAYER_POSITION_UPDATE_MS / 1000) *
    clamp(config.BOT_AI_CONFIG.MOVE_SMOOTHNESS, 0.1, 2);

  if (distance <= maxStep || distance === 0) {
    return { nextX: targetX, nextY: targetY };
  }

  const ratio = maxStep / distance;
  const nextX = x + diffX * ratio;
  const nextY = y + diffY * ratio;

  return {
    nextX: clamp(nextX, 0, config.GAME_CONFIG.GRID_COLS - 0.001),
    nextY: clamp(nextY, 0, config.GAME_CONFIG.GRID_ROWS - 0.001),
  };
};
