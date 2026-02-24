/**
 * playerPosition
 * プレイヤー座標からマップ上のセル位置を解決する
 */
import { gridMapLogic } from "@repo/shared";
import { Player } from "./Player.js";

/** プレイヤー座標に対応するグリッドインデックスを返す */
export const getPlayerGridIndex = (player: Player): number | null => {
  return gridMapLogic.getGridIndexFromPosition(player.x, player.y);
};
