/**
 * gameResultCalculator
 * マップ塗り状態から最終順位ペイロードを算出する純関数を提供する
 * 塗り率計算，同率順位付け，チーム名解決を一箇所で扱う
 */
import { config } from "@server/config";
import type { GameResultPayload, PlayerGameStats } from "@repo/shared";

/** プレイヤースタッツ構築に必要な最小情報 */
type PlayerStatsSource = {
  id: string;
  name: string;
  teamId: number;
  paintCount: number;
  bombHitCount: number;
};

/** グリッド色配列とプレイヤー情報からゲーム結果ペイロードを生成する */
export const buildGameResultPayload = (
  gridColors: number[],
  players?: PlayerStatsSource[],
): GameResultPayload => {
  const { TEAM_COUNT } = config.GAME_CONFIG;
  const totalCells = gridColors.length;
  const paintedCounts = new Array<number>(TEAM_COUNT).fill(0);

  gridColors.forEach((teamId) => {
    if (!Number.isInteger(teamId) || teamId < 0 || teamId >= TEAM_COUNT) {
      return;
    }

    paintedCounts[teamId] += 1;
  });

  const rankings = paintedCounts
    .map((paintedCellCount, teamId) => ({
      rank: 0,
      teamId,
      teamName: config.TEAM_NAMES[teamId] ?? `チーム${teamId + 1}`,
      paintRate: totalCells > 0 ? (paintedCellCount / totalCells) * 100 : 0,
    }))
    .sort((a, b) => {
      if (b.paintRate !== a.paintRate) {
        return b.paintRate - a.paintRate;
      }

      return a.teamId - b.teamId;
    });

  let currentRank = 0;
  let previousPaintRate: number | null = null;
  const epsilon = 1e-9;

  rankings.forEach((item, index) => {
    if (
      previousPaintRate === null ||
      Math.abs(item.paintRate - previousPaintRate) > epsilon
    ) {
      currentRank = index + 1;
      previousPaintRate = item.paintRate;
    }

    item.rank = currentRank;
  });

  const playerStats: PlayerGameStats[] | undefined = players?.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    teamId: p.teamId,
    paintCount: p.paintCount,
    bombHitCount: p.bombHitCount,
  }));

  return {
    rankings,
    finalGridColors: [...gridColors],
    ...(playerStats ? { playerStats } : {}),
  };
};
