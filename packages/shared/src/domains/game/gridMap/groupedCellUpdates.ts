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

// teamId キーとして受理する整数文字列（負値も許容する）
const TEAM_ID_KEY_PATTERN = /^-?\d+$/;

// teamId キーを整数へ変換し，整数化できないキーは null を返す
const parseTeamIdKey = (teamIdStr: string): number | null => {
  if (!TEAM_ID_KEY_PATTERN.test(teamIdStr)) {
    return null;
  }

  // 桁数超過で Infinity へ丸められるキーもここで除外する
  const teamId = Number(teamIdStr);
  return Number.isInteger(teamId) ? teamId : null;
};

/**
 * GroupedCellUpdates を CellUpdate 配列へ展開する（受信時）
 * 整数として解釈できないキーのエントリは不正値になるため読み飛ばす
 */
export const ungroupCellUpdates = (
  grouped: GroupedCellUpdates,
): CellUpdate[] => {
  const updates: CellUpdate[] = [];

  for (const [teamIdStr, indices] of Object.entries(grouped)) {
    const teamId = parseTeamIdKey(teamIdStr);
    if (teamId === null) {
      continue;
    }

    for (const index of indices) {
      updates.push({ index, teamId });
    }
  }

  return updates;
};
