import { gridMapLogic } from "@repo/shared";
import { Player } from "./Player.js";

export const getPlayerGridIndex = (player: Player): number | null => {
  return gridMapLogic.getGridIndexFromPosition(player.x, player.y);
};
