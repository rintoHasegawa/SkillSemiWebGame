/**
 * useResultView
 * リザルト画面の表示モードとタブ状態を管理する
 */
import { useEffect, useState } from "react";
import type { ResultTabMode } from "../types/resultTabMode";
import type { ResultViewMode } from "../types/resultViewMode";

type UseResultViewReturn = {
  viewMode: ResultViewMode;
  activeTab: ResultTabMode;
  isRankingVisible: boolean;
  showRanking: () => void;
  showMapPreview: () => void;
  setActiveTab: (tab: ResultTabMode) => void;
};

/** リザルト画面のビュー状態を返す */
export const useResultView = (resultToken: unknown): UseResultViewReturn => {
  const [viewMode, setViewMode] = useState<ResultViewMode>("mapPreview");
  const [activeTab, setActiveTab] = useState<ResultTabMode>("teamRanking");
  const isRankingVisible = viewMode === "ranking";

  useEffect(() => {
    setViewMode("mapPreview");
    setActiveTab("teamRanking");
  }, [resultToken]);

  return {
    viewMode,
    activeTab,
    isRankingVisible,
    showRanking: () => setViewMode("ranking"),
    showMapPreview: () => setViewMode("mapPreview"),
    setActiveTab,
  };
};
