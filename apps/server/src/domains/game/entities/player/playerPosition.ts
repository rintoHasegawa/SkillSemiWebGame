/**
 * playerPosition
 * プレイヤー座標からマップ上のセル位置を解決する
 */
import { domain } from "@repo/shared";
import { Player } from "./Player.js";

/** プレイヤー座標に対応するグリッドインデックスを返す */
export const getPlayerGridIndex = (player: Player): number | null => {
  return domain.gridMap.getGridIndexFromPosition(player.x, player.y);
};
