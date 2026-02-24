import type { gridMapTypes } from "@repo/shared";

export const drainPendingUpdates = (
  pendingUpdates: gridMapTypes.CellUpdate[]
): gridMapTypes.CellUpdate[] => {
  const updates = [...pendingUpdates];
  pendingUpdates.length = 0;
  return updates;
};
