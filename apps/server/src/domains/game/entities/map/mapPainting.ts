import type { gridMapTypes } from "@repo/shared";

type PaintCellParams = {
  gridColors: number[];
  pendingUpdates: gridMapTypes.CellUpdate[];
  index: number;
  teamId: number;
};

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
