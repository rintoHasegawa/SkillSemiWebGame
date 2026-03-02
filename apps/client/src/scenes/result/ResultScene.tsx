/**
 * ResultScene
 * リザルト画面の表示状態を管理するコンテナコンポーネント
 * 背景演出と順位表の切り替え表示を制御する
 */
import type { GameResultPayload } from "@repo/shared";
import { useEffect, useState } from "react";
import { config } from "../../config";
import { ResultActionBar } from "./components/ResultActionBar";
import { ResultBackground } from "./components/ResultBackground";
import { ResultPlayerStatsTable } from "./components/ResultPlayerStatsTable";
import { ResultRankingTable } from "./components/ResultRankingTable";
import {
  RESULT_BACKGROUND_DARK_OVERLAY_STYLE,
  RESULT_CONTENT_STYLE,
  RESULT_KEYFRAMES_CSS,
  RESULT_ROOT_STYLE,
  RESULT_TAP_GUIDE_STYLE,
  RESULT_TITLE_STYLE,
  getResultTitleTextStyle,
} from "./styles/resultStyles";
import type { ResultViewMode } from "./types/resultViewMode";

type Props = {
  result: GameResultPayload | null;
  onBackToTitle: () => void;
};

const formatPaintRate = (value: number): string => `${value.toFixed(1)}%`;

/** 最終結果データを受け取り，順位一覧を表示する */
export const ResultScene = ({ result, onBackToTitle }: Props) => {
  const [viewMode, setViewMode] = useState<ResultViewMode>("mapPreview");
  const isRankingVisible = viewMode === "ranking";

  useEffect(() => {
    setViewMode("mapPreview");
  }, [result]);

  if (!result) {
    return (
      <div style={{ color: "white", padding: 40 }}>結果を読み込み中...</div>
    );
  }

  const winnerTeamId =
    result.rankings.find((row) => row.rank === 1)?.teamId ??
    result.rankings[0]?.teamId;
  const winnerColor =
    config.GAME_CONFIG.TEAM_COLORS[winnerTeamId ?? -1] ?? "#888888";
  const gridCols = config.GAME_CONFIG.GRID_COLS;
  const gridRows = config.GAME_CONFIG.GRID_ROWS;
  const totalCells = gridCols * gridRows;
  const finalGridColors = Array.from({ length: totalCells }, (_, index) => {
    const teamId = result.finalGridColors?.[index];
    return typeof teamId === "number" ? teamId : -1;
  });

  return (
    <div
      style={{
        ...RESULT_ROOT_STYLE,
        cursor: isRankingVisible ? "default" : "pointer",
      }}
      onClick={() => {
        if (isRankingVisible) {
          return;
        }

        setViewMode("ranking");
      }}
    >
      <style>{RESULT_KEYFRAMES_CSS}</style>
      <ResultBackground
        gridCols={gridCols}
        gridRows={gridRows}
        finalGridColors={finalGridColors}
        winnerColor={winnerColor}
      />
      <div style={RESULT_BACKGROUND_DARK_OVERLAY_STYLE} />

      <div style={RESULT_CONTENT_STYLE}>
        {isRankingVisible && (
          <ResultActionBar
            onBackToTitle={onBackToTitle}
            onShowMapPreview={() => setViewMode("mapPreview")}
          />
        )}

        <h2 style={RESULT_TITLE_STYLE}>
          <span style={getResultTitleTextStyle(winnerColor)}>結果発表</span>
        </h2>

        {!isRankingVisible && (
          <div style={RESULT_TAP_GUIDE_STYLE}>Tap To Result</div>
        )}

        {isRankingVisible && (
          <ResultRankingTable
            rankings={result.rankings}
            formatPaintRate={formatPaintRate}
          />
        )}

        {isRankingVisible && result.playerStats && result.playerStats.length > 0 && (
          <ResultPlayerStatsTable playerStats={result.playerStats} />
        )}
      </div>
    </div>
  );
};
