import { config } from "@repo/shared";
import { Player } from "./Player.js";

export const createSpawnedPlayer = (id: string): Player => {
  const player = new Player(id);
  player.x = config.GAME_CONFIG.GRID_COLS / 2;
  player.y = config.GAME_CONFIG.GRID_ROWS / 2;
  return player;
};
