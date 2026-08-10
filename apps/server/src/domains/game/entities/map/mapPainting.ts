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

// グリッド配列の要素として成立するindexかを判定する
const isPaintableCellIndex = (
  index: number,
  gridSize: number,
): boolean => {
  return Number.isInteger(index) && index >= 0 && index < gridSize;
};

/**
 * マップセルの色が変わった場合のみ差分へ追加し，変更の有無を返す
 * グリッド範囲外・非整数のindexは同期ズレの原因になるため塗らずに false を返す
 */
export const paintCellIfChanged = ({
  gridColors,
  pendingUpdates,
  index,
  teamId,
}: PaintCellParams): boolean => {
  if (!isPaintableCellIndex(index, gridColors.length)) {
    return false;
  }

  if (gridColors[index] === teamId) {
    return false;
  }

  gridColors[index] = teamId;
  pendingUpdates.push({ index, teamId });
  return true;
};
