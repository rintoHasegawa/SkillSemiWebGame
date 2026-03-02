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

/** マップセルの色が変わった場合のみ差分へ追加し，変更の有無を返す */
export const paintCellIfChanged = ({
  gridColors,
  pendingUpdates,
  index,
  teamId,
}: PaintCellParams): boolean => {
  if (gridColors[index] === teamId) {
    return false;
  }

  gridColors[index] = teamId;
  pendingUpdates.push({ index, teamId });
  return true;
};
