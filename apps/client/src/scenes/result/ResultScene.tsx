/**
 * ResultScene
 * リザルト画面の表示状態を管理するコンテナコンポーネント
 * 背景演出と順位表の切り替え表示を制御する
 */
import type { GameResultPayload } from "@repo/shared";
import { useMemo } from "react";
import { config } from "../../config";
import { ResultActionBar } from "./components/ResultActionBar";
import { ResultBackground } from "./components/ResultBackground";
import { ResultTabContent } from "./components/ResultTabContent";
import { ResultTabBar } from "./components/ResultTabBar";
import {
  RESULT_BACKGROUND_DARK_OVERLAY_STYLE,
  RESULT_RANKING_ACTION_BAR_STYLE,
  RESULT_RANKING_HEADER_STYLE,
  RESULT_CONTENT_STYLE,
  RESULT_KEYFRAMES_CSS,
  RESULT_ROOT_STYLE,
  RESULT_TAP_GUIDE_STYLE,
  RESULT_TITLE_STYLE,
  getResultTitleTextStyle,
} from "./styles/resultStyles";
import { useResultView } from "./hooks/useResultView";

type Props = {
  result: GameResultPayload | null;
  onBackToTitle: () => void;
};

/** 最終結果データを受け取り，順位一覧を表示する */
export const ResultScene = ({ result, onBackToTitle }: Props) => {
  const {
    activeTab,
    isRankingVisible,
    showMapPreview,
    showRanking,
    setActiveTab,
  } = useResultView(result);

  // hooksはearly returnより前に呼ぶ必要があるため，resultがnullの場合はフォールバック値を使用
  const winnerTeamId = useMemo(
    () =>
      result?.rankings.find((row) => row.rank === 1)?.teamId ??
      result?.rankings[0]?.teamId,
    [result?.rankings],
  );
  const winnerColor = useMemo(
    () => config.GAME_CONFIG.TEAM_COLORS[winnerTeamId ?? -1] ?? "#888888",
    [winnerTeamId],
  );
  const gridCols = config.GAME_CONFIG.GRID_COLS;
  const gridRows = config.GAME_CONFIG.GRID_ROWS;
  const totalCells = gridCols * gridRows;
  const finalGridColors = useMemo(
    () =>
      Array.from({ length: totalCells }, (_, index) => {
        const teamId = result?.finalGridColors?.[index];
        return typeof teamId === "number" ? teamId : -1;
      }),
    [result?.finalGridColors, totalCells],
  );

  if (!result) {
    return (
      <div style={{ color: "white", padding: 40 }}>結果を読み込み中...</div>
    );
  }

  return (
    <div
      style={{
        ...RESULT_ROOT_STYLE,
        cursor: isRankingVisible ? "default" : "pointer",
      }}
      onPointerDown={() => {
        if (isRankingVisible) {
          return;
        }

        showRanking();
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
        {isRankingVisible ? (
          <div style={RESULT_RANKING_HEADER_STYLE}>
            <h2 style={RESULT_TITLE_STYLE}>
              <span style={getResultTitleTextStyle(winnerColor)}>結果発表</span>
            </h2>
            <ResultActionBar
              onBackToTitle={onBackToTitle}
              onShowMapPreview={showMapPreview}
              style={RESULT_RANKING_ACTION_BAR_STYLE}
            />
          </div>
        ) : (
          <h2 style={RESULT_TITLE_STYLE}>
            <span style={getResultTitleTextStyle(winnerColor)}>結果発表</span>
          </h2>
        )}

        {!isRankingVisible && (
          <div style={RESULT_TAP_GUIDE_STYLE}>Tap To Result</div>
        )}

        {isRankingVisible && (
          <ResultTabBar activeTab={activeTab} onTabChange={setActiveTab} />
        )}

        {isRankingVisible && (
          <ResultTabContent
            activeTab={activeTab}
            rankings={result.rankings}
            playerStats={result.playerStats ?? []}
          />
        )}
      </div>
    </div>
  );
};
