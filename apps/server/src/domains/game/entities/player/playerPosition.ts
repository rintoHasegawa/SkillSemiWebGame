/**
 * playerPosition
 * プレイヤー座標からマップ上のセル位置を解決する
 */
import { domain } from "@repo/shared";
import { Player } from "./Player.js";

type MapGridSize = {
  gridCols: number;
  gridRows: number;
};

/** プレイヤー座標に対応するグリッドインデックスを返す */
export const getPlayerGridIndex = (
  player: Player,
  size?: MapGridSize,
): number | null => {
  if (size) {
    return domain.game.gridMap.getGridIndexFromPositionWithSize(
      player.x,
      player.y,
      size.gridCols,
      size.gridRows,
    );
  }

  return domain.game.gridMap.getGridIndexFromPosition(player.x, player.y);
};
