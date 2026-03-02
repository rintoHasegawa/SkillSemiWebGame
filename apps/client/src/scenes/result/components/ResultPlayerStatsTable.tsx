/**
 * ResultPlayerStatsTable
 * リザルト画面のプレイヤー個人スタッツ表を表示する
 * 各プレイヤーの塗り回数と爆弾ヒット回数の一覧描画を担当する
 */
import type { PlayerGameStats } from "@repo/shared";
import { config } from "@client/config";
import {
  RESULT_PLAYER_STATS_HEADER_ROW_STYLE,
  RESULT_PLAYER_STATS_SCROLL_BODY_STYLE,
  RESULT_TABLE_STYLE,
  RESULT_RIGHT_ALIGN_STYLE,
  RESULT_TEAM_CELL_STYLE,
  getResultPlayerStatsBodyRowStyle,
  getResultTeamColorDotStyle,
  RESULT_PLAYER_STATS_SECTION_TITLE_STYLE,
  RESULT_PLAYER_STATS_VALUE_STYLE,
} from "../styles/resultStyles";

type Props = {
  playerStats: PlayerGameStats[];
};

/** プレイヤー個人スタッツ表を描画するコンポーネント */
export const ResultPlayerStatsTable = ({ playerStats }: Props) => {
  const sorted = [...playerStats].sort((a, b) => b.paintCount - a.paintCount);

  return (
    <>
      <h3 style={RESULT_PLAYER_STATS_SECTION_TITLE_STYLE}>個人スタッツ</h3>
      <div style={RESULT_TABLE_STYLE}>
        <div style={RESULT_PLAYER_STATS_HEADER_ROW_STYLE}>
          <span>プレイヤー</span>
          <span style={RESULT_RIGHT_ALIGN_STYLE}>塗り回数</span>
          <span style={RESULT_RIGHT_ALIGN_STYLE}>ヒット数</span>
        </div>

        <div style={RESULT_PLAYER_STATS_SCROLL_BODY_STYLE}>
          {sorted.map((player, index) => (
            <div
              key={player.playerId}
              style={getResultPlayerStatsBodyRowStyle(index)}
            >
              <span style={RESULT_TEAM_CELL_STYLE}>
                <span
                  style={getResultTeamColorDotStyle(
                    config.GAME_CONFIG.TEAM_COLORS[player.teamId] ?? "#888888",
                  )}
                />
                <span>{player.playerName}</span>
              </span>
              <span style={RESULT_PLAYER_STATS_VALUE_STYLE}>
                {player.paintCount.toLocaleString()}
              </span>
              <span style={RESULT_PLAYER_STATS_VALUE_STYLE}>
                {player.bombHitCount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
