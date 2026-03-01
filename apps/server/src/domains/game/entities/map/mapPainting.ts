/**
 * mapPainting
 * マップセルの塗り更新と差分追加処理を提供する
 */
import { domain } from "@repo/shared";

type PaintCellParams = {
  gridColors: number[];
  pendingUpdates: domain.game.gridMap.CellUpdate[];
  index: number;
  teamId: number;
};

/** マップセルの色が変わった場合のみ差分へ追加する */
export const paintCellIfChanged = ({
  gridColors,
  pendingUpdates,
  index,
  teamId,
}: PaintCellParams): void => {
  if (gridColors[index] === teamId) {
    return;
  }

  gridColors[index] = teamId;
  pendingUpdates.push({ index, teamId });
};
