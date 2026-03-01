/**
 * mapUpdates
 * マップ差分キューの取り出しとクリア処理を提供する
 */
import { domain } from "@repo/shared";

/**
 * 差分キューの参照をそのまま返却し，呼び出し元の配列を新しい空配列で差し替える
 * スプレッドコピーを避けてゼロコピーで返却する
 */
export const swapPendingUpdates = (
  owner: { pendingUpdates: domain.game.gridMap.CellUpdate[] },
): domain.game.gridMap.CellUpdate[] => {
  const updates = owner.pendingUpdates;
  owner.pendingUpdates = [];
  return updates;
};
