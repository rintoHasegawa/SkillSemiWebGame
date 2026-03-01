/**
 * mapUpdates
 * マップ差分キューの取り出しとクリア処理を提供する
 */
import { domain } from "@repo/shared";

/** 差分キューを配列として返却し，キューを空にする */
export const drainPendingUpdates = (
  pendingUpdates: domain.game.gridMap.CellUpdate[]
): domain.game.gridMap.CellUpdate[] => {
  const updates = [...pendingUpdates];
  pendingUpdates.length = 0;
  return updates;
};
