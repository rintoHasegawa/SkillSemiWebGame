import { Player } from "./Player.js";

export const isValidPosition = (x: number, y: number): boolean => {
  return Number.isFinite(x) && Number.isFinite(y);
};

export const setPlayerPosition = (
  player: Player,
  x: number,
  y: number
): void => {
  player.x = x;
  player.y = y;
};
