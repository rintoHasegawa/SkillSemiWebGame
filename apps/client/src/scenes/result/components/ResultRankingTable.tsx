/**
 * ResultRankingTable
 * リザルト画面の順位表を表示する
 * 順位，チーム名，塗り率の一覧描画を担当する
 */
import type { GameResultRanking } from "@repo/shared";
import { config } from "@client/config";
import {
  RESULT_HEADER_ROW_STYLE,
  RESULT_RANKING_SCROLL_BODY_STYLE,
  RESULT_RATE_STYLE,
  RESULT_RIGHT_ALIGN_STYLE,
  RESULT_TABLE_STYLE,
  RESULT_TEAM_CELL_STYLE,
  getResultBodyRowStyle,
  getResultRankStyle,
  getResultTeamColorDotStyle,
} from "../styles/resultStyles";

type Props = {
  rankings: GameResultRanking[];
  formatPaintRate: (value: number) => string;
};

/** 順位表を描画するコンポーネント */
export const ResultRankingTable = ({ rankings, formatPaintRate }: Props) => {
  return (
    <div style={RESULT_TABLE_STYLE}>
      <div style={RESULT_HEADER_ROW_STYLE}>
        <span>順位</span>
        <span>チーム名</span>
        <span style={RESULT_RIGHT_ALIGN_STYLE}>塗り率</span>
      </div>

      <div style={RESULT_RANKING_SCROLL_BODY_STYLE}>
        {rankings.map((row, index) => (
          <div
            key={`${row.teamId}-${index}`}
            style={getResultBodyRowStyle(index)}
          >
            <span style={getResultRankStyle(row.rank)}>{row.rank}位</span>
            <span style={RESULT_TEAM_CELL_STYLE}>
              <span
                style={getResultTeamColorDotStyle(
                  config.GAME_CONFIG.TEAM_COLORS[row.teamId] ?? "#888888",
                )}
              />
              <span>{row.teamName}</span>
            </span>
            <span style={RESULT_RATE_STYLE}>
              {formatPaintRate(row.paintRate)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
