/**
 * ResultPlayerRankingTable
 * リザルト画面のプレイヤー個人ランキング表を表示する
 * 塗り回数またはヒット数でソートして順位表示を担当する
 */
import type { PlayerGameStats } from "@repo/shared";
import { useMemo } from "react";
import { config } from "@client/config";
import {
  RESULT_PLAYER_RANKING_HEADER_ROW_STYLE,
  RESULT_PLAYER_RANKING_SCROLL_BODY_STYLE,
  RESULT_TABLE_STYLE,
  RESULT_RIGHT_ALIGN_STYLE,
  RESULT_TEAM_CELL_STYLE,
  getResultPlayerRankingBodyRowStyle,
  getResultTeamColorDotStyle,
  RESULT_PLAYER_RANKING_VALUE_STYLE,
  getResultRankStyle,
} from "../styles/resultStyles";

type Props = {
  playerStats: PlayerGameStats[];
  sortKey: "paintCount" | "bombHitCount";
  valueLabel: string;
};

/** プレイヤー個人ランキング表を描画するコンポーネント */
export const ResultPlayerRankingTable = ({
  playerStats,
  sortKey,
  valueLabel,
}: Props) => {
  const sorted = useMemo(
    () => [...playerStats].sort((a, b) => b[sortKey] - a[sortKey]),
    [playerStats, sortKey],
  );

  return (
    <div style={RESULT_TABLE_STYLE}>
      <div style={RESULT_PLAYER_RANKING_HEADER_ROW_STYLE}>
        <span>順位</span>
        <span>プレイヤー</span>
        <span style={RESULT_RIGHT_ALIGN_STYLE}>{valueLabel}</span>
      </div>

      <div style={RESULT_PLAYER_RANKING_SCROLL_BODY_STYLE}>
        {sorted.map((player, index) => {
          const rank = index + 1;
          const value = player[sortKey];
          const displayValue =
            sortKey === "paintCount" ? value.toLocaleString() : value;

          return (
            <div
              key={player.playerId}
              style={getResultPlayerRankingBodyRowStyle(index)}
            >
              <span style={getResultRankStyle(rank)}>{rank}位</span>
              <span style={RESULT_TEAM_CELL_STYLE}>
                <span
                  style={getResultTeamColorDotStyle(
                    config.GAME_CONFIG.TEAM_COLORS[player.teamId] ?? "#888888",
                  )}
                />
                <span>{player.playerName}</span>
              </span>
              <span style={RESULT_PLAYER_RANKING_VALUE_STYLE}>
                {displayValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
