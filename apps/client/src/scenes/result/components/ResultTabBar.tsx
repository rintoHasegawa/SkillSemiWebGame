/**
 * ResultTabBar
 * リザルト画面のタブバーを表示する
 * チーム順位・塗り回数・ヒット数の3つのタブを提供する
 */
import type { ResultTabMode } from "../types/resultTabMode";
import {
  RESULT_TAB_BAR_CONTAINER_STYLE,
  getResultTabButtonStyle,
  RESULT_TAB_ICON_STYLE,
  RESULT_TAB_LABEL_STYLE,
} from "../styles/resultStyles";

type Props = {
  activeTab: ResultTabMode;
  onTabChange: (tab: ResultTabMode) => void;
};

type TabInfo = {
  mode: ResultTabMode;
  icon: string;
  label: string;
};

const TABS: TabInfo[] = [
  { mode: "teamRanking", icon: "🏆", label: "チーム順位" },
  { mode: "paintCount", icon: "🎨", label: "塗り回数" },
  { mode: "bombHits", icon: "💣", label: "ヒット数" },
];

/** タブバーを描画するコンポーネント */
export const ResultTabBar = ({ activeTab, onTabChange }: Props) => {
  return (
    <div style={RESULT_TAB_BAR_CONTAINER_STYLE}>
      {TABS.map((tab) => (
        <button
          key={tab.mode}
          style={getResultTabButtonStyle(activeTab === tab.mode)}
          onClick={() => onTabChange(tab.mode)}
          type="button"
        >
          <span style={RESULT_TAB_ICON_STYLE}>{tab.icon}</span>
          <span style={RESULT_TAB_LABEL_STYLE}>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
