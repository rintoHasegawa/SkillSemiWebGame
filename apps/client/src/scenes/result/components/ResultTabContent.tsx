/**
 * ResultTabContent
 * リザルト画面のタブ内容表示を一元化する
 */
import type { GameResultRanking, PlayerGameStats } from "@repo/shared";
import { ResultPlayerRankingTable } from "./ResultPlayerRankingTable";
import { ResultRankingTable } from "./ResultRankingTable";
import { RESULT_CONTENT_FADE_STYLE } from "../styles/resultStyles";
import type { ResultTabMode } from "../types/resultTabMode";

type Props = {
  activeTab: ResultTabMode;
  rankings: GameResultRanking[];
  playerStats: PlayerGameStats[];
};

const formatPaintRate = (value: number): string => `${value.toFixed(1)}%`;

/** 選択中タブに応じたコンテンツを描画する */
export const ResultTabContent = ({
  activeTab,
  rankings,
  playerStats,
}: Props) => {
  if (activeTab === "teamRanking") {
    return (
      <div style={RESULT_CONTENT_FADE_STYLE}>
        <ResultRankingTable
          rankings={rankings}
          formatPaintRate={formatPaintRate}
        />
      </div>
    );
  }

  if (playerStats.length === 0) {
    return null;
  }

  if (activeTab === "paintCount") {
    return (
      <div style={RESULT_CONTENT_FADE_STYLE}>
        <ResultPlayerRankingTable
          playerStats={playerStats}
          sortKey="paintCount"
          valueLabel="塗り回数"
        />
      </div>
    );
  }

  return (
    <div style={RESULT_CONTENT_FADE_STYLE}>
      <ResultPlayerRankingTable
        playerStats={playerStats}
        sortKey="bombHitCount"
        valueLabel="ヒット数"
      />
    </div>
  );
};
