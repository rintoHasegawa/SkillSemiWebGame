/**
 * groupedCellUpdates
 * CellUpdate配列とGroupedCellUpdatesの相互変換ユーティリティを提供する
 * サーバー送信時のグループ化とクライアント受信時の展開を担う
 */
import { isKnownTeamId, isUnknownTeamId } from "../../../config/teamValidators";
import type { CellUpdate, GroupedCellUpdates } from "./gridMap.type";

/**
 * CellUpdate 配列を teamId 別にグループ化する（送信時）
 * 同一セルの更新は最後の1件へ集約し，展開順に依存しない形へ正規化する
 */
export const groupCellUpdates = (
  updates: CellUpdate[],
): GroupedCellUpdates => {
  const grouped: GroupedCellUpdates = {};

  // 送信側の適用結果（後勝ち）と一致させるため，セルごとに最後の teamId を残す
  const latestTeamIdByIndex = new Map<number, number>();
  for (const { index, teamId } of updates) {
    latestTeamIdByIndex.set(index, teamId);
  }

  for (const [index, teamId] of latestTeamIdByIndex) {
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

// セル teamId として成立する値か（未塗装または実在チーム）を判定する
const isCellTeamId = (teamId: number): boolean => {
  return isUnknownTeamId(teamId) || isKnownTeamId(teamId);
};

// teamId キーを整数へ変換し，セル teamId として不正なキーは null を返す
const parseTeamIdKey = (teamIdStr: string): number | null => {
  if (!TEAM_ID_KEY_PATTERN.test(teamIdStr)) {
    return null;
  }

  // 桁数超過で Infinity へ丸められるキーも値域チェックで除外される
  const teamId = Number(teamIdStr);
  return isCellTeamId(teamId) ? teamId : null;
};

/**
 * GroupedCellUpdates を CellUpdate 配列へ展開する（受信時）
 * 未塗装（-1）と実在チーム以外の teamId キーは不正値になるため読み飛ばす
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
