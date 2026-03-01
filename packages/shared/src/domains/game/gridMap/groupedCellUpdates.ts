/**
 * groupedCellUpdates
 * CellUpdate配列とGroupedCellUpdatesの相互変換ユーティリティを提供する
 * サーバー送信時のグループ化とクライアント受信時の展開を担う
 */
import type { CellUpdate, GroupedCellUpdates } from "./gridMap.type";

/** CellUpdate 配列を teamId 別にグループ化する（送信時） */
export const groupCellUpdates = (
  updates: CellUpdate[],
): GroupedCellUpdates => {
  const grouped: GroupedCellUpdates = {};

  for (const { index, teamId } of updates) {
    const key = String(teamId);
    const list = grouped[key];

    if (list) {
      list.push(index);
    } else {
      grouped[key] = [index];
    }
  }

  return grouped;
};

/** GroupedCellUpdates を CellUpdate 配列へ展開する（受信時） */
export const ungroupCellUpdates = (
  grouped: GroupedCellUpdates,
): CellUpdate[] => {
  const updates: CellUpdate[] = [];

  for (const [teamIdStr, indices] of Object.entries(grouped)) {
    const teamId = Number(teamIdStr);

    for (const index of indices) {
      updates.push({ index, teamId });
    }
  }

  return updates;
};
