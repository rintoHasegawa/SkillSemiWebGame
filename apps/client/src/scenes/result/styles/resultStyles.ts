/**
 * resultStyles
 * リザルト画面専用のスタイル定義を集約する
 * 背景演出，テーブル表示，文字装飾を一元管理する
 */
import type { CSSProperties } from "react";
import { config } from "@client/config";

/** 順位表のグリッド列定義 */
export const RESULT_ROW_GRID_TEMPLATE = "120px 1fr 180px";

/** 紙吹雪の表示数 */
export const RESULT_CONFETTI_COUNT = 36;

/** リザルト画面ルートのスタイル */
export const RESULT_ROOT_STYLE: CSSProperties = {
  width: "100vw",
  height: "100dvh",
  position: "relative",
  overflow: "hidden",
  background: "#111",
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: "clamp(12px, 3.5vw, 24px)",
  paddingLeft: "clamp(12px, 3.5vw, 24px)",
  paddingRight: "clamp(12px, 3.5vw, 24px)",
  paddingBottom: "calc(clamp(12px, 3.5vw, 24px) + env(safe-area-inset-bottom))",
  boxSizing: "border-box",
  overscrollBehaviorX: "none",
  overscrollBehaviorY: "none",
  touchAction: "pan-y",
};

/** 結果発表タイトルのスタイル */
export const RESULT_TITLE_STYLE: CSSProperties = {
  margin: "0 0 10px 0",
  fontSize: "clamp(1.8rem, 4.4vw, 2.6rem)",
  fontFamily: "'Yu Mincho', 'Hiragino Mincho ProN', serif",
  letterSpacing: "0.14em",
  fontWeight: 800,
  textShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
  animation: "titleGleam 3.6s ease-in-out infinite",
};

/** リザルト表示時のヘッダー領域スタイル */
export const RESULT_RANKING_HEADER_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: "960px",
  minWidth: 0,
  minHeight: "44px",
  position: "relative",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  marginBottom: "6px",
};

/** リザルト表示時の左右対称操作ボタン行スタイル */
export const RESULT_RANKING_ACTION_BAR_STYLE: CSSProperties = {
  width: "auto",
  position: "absolute",
  top: 0,
  left: "8px",
  right: "8px",
  marginBottom: 0,
};

/** リザルト画面本文レイヤーのスタイル */
export const RESULT_CONTENT_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: "960px",
  flex: 1,
  minHeight: 0,
  overflowX: "hidden",
  overflowY: "hidden",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  zIndex: 1,
  overscrollBehaviorX: "none",
  overscrollBehaviorY: "none",
};

/** 背景エフェクト共通レイヤーの基底スタイル */
export const RESULT_EFFECT_LAYER_BASE_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

/** 最終マップ背景レイヤーのスタイル */
export const RESULT_MAP_BACKGROUND_LAYER_STYLE: CSSProperties = {
  ...RESULT_EFFECT_LAYER_BASE_STYLE,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 0,
  opacity: 0.9,
};

/** 暗幕オーバーレイのスタイル */
export const RESULT_BACKGROUND_DARK_OVERLAY_STYLE: CSSProperties = {
  ...RESULT_EFFECT_LAYER_BASE_STYLE,
  background: "rgba(0, 0, 0, 0.62)",
};

/** 紙吹雪レイヤーのスタイル */
export const RESULT_CONFETTI_LAYER_STYLE: CSSProperties = {
  ...RESULT_EFFECT_LAYER_BASE_STYLE,
  overflow: "hidden",
  zIndex: 0,
};

/** タップ案内文のスタイル */
export const RESULT_TAP_GUIDE_STYLE: CSSProperties = {
  marginTop: "6px",
  fontSize: "clamp(1rem, 2.8vw, 1.35rem)",
  letterSpacing: "0.14em",
  fontWeight: 700,
  color: "rgba(255, 255, 255, 0.92)",
  textShadow: "0 2px 10px rgba(0, 0, 0, 0.6)",
  animation: "tapPromptPulse 1.6s ease-in-out infinite",
};

/** 順位表コンテナのスタイル */
export const RESULT_TABLE_STYLE: CSSProperties = {
  width: "min(100%, 720px)",
  maxWidth: "720px",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: "8px",
  overflow: "hidden",
  backdropFilter: "blur(2px)",
  background: "rgba(16, 16, 16, 0.62)",
  boxSizing: "border-box",
};

/** 順位表本文スクロール領域のスタイル */
export const RESULT_RANKING_SCROLL_BODY_STYLE: CSSProperties = {
  maxHeight: "min(40dvh, 320px)",
  overflowY: "auto",
  overscrollBehaviorY: "contain",
  WebkitOverflowScrolling: "touch",
};

/** 順位表ヘッダー行のスタイル */
export const RESULT_HEADER_ROW_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: RESULT_ROW_GRID_TEMPLATE,
  background: "#222",
  padding: "12px 16px",
  fontWeight: "bold",
};

/** 右寄せ表記のスタイル */
export const RESULT_RIGHT_ALIGN_STYLE: CSSProperties = { textAlign: "right" };

/** 塗り率セルのスタイル */
export const RESULT_RATE_STYLE: CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

/** 順位文字列の基底スタイル */
export const RESULT_RANK_BASE_STYLE: CSSProperties = {
  fontFamily: "serif",
  fontWeight: 800,
  letterSpacing: "0.04em",
  fontVariantNumeric: "tabular-nums",
  fontSize: "1.15rem",
  textShadow: "0 2px 8px rgba(0, 0, 0, 0.42)",
};

/** チーム列の表示スタイル */
export const RESULT_TEAM_CELL_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
};

/** タイトル演出テキストのスタイルを返す */
export const getResultTitleTextStyle = (
  winnerColor: string,
): CSSProperties => ({
  display: "inline-block",
  background: `linear-gradient(120deg, #FFF8D9 0%, #FFD95A 42%, ${winnerColor} 100%)`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  WebkitTextStroke: "1px rgba(255, 255, 255, 0.22)",
  filter: "drop-shadow(0 0 8px rgba(255, 220, 120, 0.35))",
});

/** 順位に応じた文字装飾スタイルを返す */
export const getResultRankStyle = (rank: number): CSSProperties => {
  if (rank === 1) {
    return {
      ...RESULT_RANK_BASE_STYLE,
      color: "#FFD95A",
      textShadow:
        "0 0 10px rgba(255, 217, 90, 0.5), 0 2px 8px rgba(0, 0, 0, 0.42)",
    };
  }

  if (rank === 2) {
    return {
      ...RESULT_RANK_BASE_STYLE,
      color: "#E2E8F0",
      textShadow:
        "0 0 8px rgba(226, 232, 240, 0.35), 0 2px 8px rgba(0, 0, 0, 0.42)",
    };
  }

  if (rank === 3) {
    return {
      ...RESULT_RANK_BASE_STYLE,
      color: "#E7A977",
      textShadow:
        "0 0 8px rgba(231, 169, 119, 0.35), 0 2px 8px rgba(0, 0, 0, 0.42)",
    };
  }

  return {
    ...RESULT_RANK_BASE_STYLE,
    color: "#F5F5F5",
  };
};

/** チーム色ドットのスタイルを返す */
export const getResultTeamColorDotStyle = (color: string): CSSProperties => ({
  width: "10px",
  height: "10px",
  borderRadius: "9999px",
  background: color,
  border: "1px solid rgba(255, 255, 255, 0.35)",
  flexShrink: 0,
});

/** 順位表本文行のスタイルを返す */
export const getResultBodyRowStyle = (index: number): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: RESULT_ROW_GRID_TEMPLATE,
  padding: "12px 16px",
  borderTop: "1px solid #333",
  background: index % 2 === 0 ? "#171717" : "#1d1d1d",
});

/** プレイヤースタッツ表のグリッド列定義 */
export const RESULT_PLAYER_STATS_ROW_GRID_TEMPLATE = "1fr 120px 120px";

/** プレイヤースタッツセクションタイトルのスタイル */
export const RESULT_PLAYER_STATS_SECTION_TITLE_STYLE: CSSProperties = {
  margin: "24px 0 10px 0",
  fontSize: "clamp(1rem, 2.6vw, 1.3rem)",
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "rgba(255, 255, 255, 0.88)",
  textShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
};

/** プレイヤースタッツ表ヘッダー行のスタイル */
export const RESULT_PLAYER_STATS_HEADER_ROW_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: RESULT_PLAYER_STATS_ROW_GRID_TEMPLATE,
  background: "#222",
  padding: "12px 16px",
  fontWeight: "bold",
};

/** プレイヤースタッツ表本文スクロール領域のスタイル */
export const RESULT_PLAYER_STATS_SCROLL_BODY_STYLE: CSSProperties = {
  maxHeight: "min(36dvh, 300px)",
  overflowY: "auto",
  overscrollBehaviorY: "contain",
  WebkitOverflowScrolling: "touch",
};

/** プレイヤースタッツ数値セルのスタイル */
export const RESULT_PLAYER_STATS_VALUE_STYLE: CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

/** プレイヤースタッツ表本文行のスタイルを返す */
export const getResultPlayerStatsBodyRowStyle = (
  index: number,
): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: RESULT_PLAYER_STATS_ROW_GRID_TEMPLATE,
  padding: "12px 16px",
  borderTop: "1px solid #333",
  background: index % 2 === 0 ? "#171717" : "#1d1d1d",
});

/** タブバーコンテナのスタイル */
export const RESULT_TAB_BAR_CONTAINER_STYLE: CSSProperties = {
  display: "flex",
  width: "min(100%, 720px)",
  maxWidth: "720px",
  minWidth: 0,
  gap: "4px",
  marginBottom: "10px",
};

/** タブボタンのスタイルを返す */
export const getResultTabButtonStyle = (isActive: boolean): CSSProperties => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  padding: "12px 8px",
  background: isActive ? "rgba(80, 80, 80, 0.9)" : "rgba(50, 50, 50, 0.6)",
  border: "none",
  borderBottom: isActive ? "3px solid #FFD95A" : "3px solid transparent",
  borderRadius: "8px 8px 0 0",
  color: isActive ? "#fff" : "#aaa",
  cursor: "pointer",
  transition: "all 0.2s ease",
  fontWeight: isActive ? 700 : 400,
  backdropFilter: "blur(2px)",
});

/** タブアイコンのスタイル */
export const RESULT_TAB_ICON_STYLE: CSSProperties = {
  fontSize: "1.4rem",
  lineHeight: 1,
};

/** タブラベルのスタイル */
export const RESULT_TAB_LABEL_STYLE: CSSProperties = {
  fontSize: "clamp(0.75rem, 2vw, 0.9rem)",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};

/** プレイヤーランキング表のグリッド列定義 */
export const RESULT_PLAYER_RANKING_ROW_GRID_TEMPLATE = "100px 1fr 140px";

/** プレイヤーランキング表ヘッダー行のスタイル */
export const RESULT_PLAYER_RANKING_HEADER_ROW_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: RESULT_PLAYER_RANKING_ROW_GRID_TEMPLATE,
  background: "#222",
  padding: "12px 16px",
  fontWeight: "bold",
};

/** プレイヤーランキング表本文スクロール領域のスタイル */
export const RESULT_PLAYER_RANKING_SCROLL_BODY_STYLE: CSSProperties = {
  maxHeight: "min(40dvh, 320px)",
  overflowY: "auto",
  overscrollBehaviorY: "contain",
  WebkitOverflowScrolling: "touch",
};

/** プレイヤーランキング数値セルのスタイル */
export const RESULT_PLAYER_RANKING_VALUE_STYLE: CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

/** プレイヤーランキング表本文行のスタイルを返す */
export const getResultPlayerRankingBodyRowStyle = (
  index: number,
): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: RESULT_PLAYER_RANKING_ROW_GRID_TEMPLATE,
  padding: "12px 16px",
  borderTop: "1px solid #333",
  background: index % 2 === 0 ? "#171717" : "#1d1d1d",
});

/** タブコンテンツのフェードアニメーション用スタイル */
export const RESULT_CONTENT_FADE_STYLE: CSSProperties = {
  animation: "tabContentFadeIn 0.2s ease-in",
  width: "100%",
  minWidth: 0,
  display: "flex",
  justifyContent: "center",
};

/** 紙吹雪1片のスタイルを返す */
export const getResultConfettiStyle = (
  index: number,
  winnerColor: string,
): CSSProperties => {
  const leftPercent = (index * 19 + 7) % 100;
  const size = 6 + (index % 5);
  const durationSec = 6 + (index % 6) * 0.55;
  const delaySec = -((index % 9) * 0.8);
  const rotateStartDeg = (index * 37) % 360;

  return {
    position: "absolute",
    top: "-12%",
    left: `${leftPercent}%`,
    width: `${size}px`,
    height: `${Math.round(size * 1.8)}px`,
    background: winnerColor,
    borderRadius: "2px",
    opacity: 0.9,
    transform: `rotate(${rotateStartDeg}deg)`,
    animation: `confettiFall ${durationSec}s linear ${delaySec}s infinite, confettiSway ${2.4 + (index % 4) * 0.35}s ease-in-out ${delaySec}s infinite`,
    boxShadow: "0 0 8px rgba(255, 255, 255, 0.18)",
  };
};

/** 最終マップ全体コンテナのスタイルを返す */
export const getResultMapWrapperStyle = (
  cols: number,
  rows: number,
): CSSProperties => ({
  width: `min(94vw, calc(92dvh * ${cols / rows}))`,
  maxHeight: "92dvh",
  aspectRatio: `${cols} / ${rows}`,
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, 1fr)`,
  border: "1px solid rgba(255, 255, 255, 0.14)",
});

/** マップ1セルのスタイルを返す */
export const getResultMapCellStyle = (teamId: number): CSSProperties => ({
  background: config.GAME_CONFIG.TEAM_COLORS[teamId] ?? "#1b1b1b",
});

/** リザルト画面のキーフレーム定義を返す */
export const RESULT_KEYFRAMES_CSS = `@keyframes confettiFall {
  0% { transform: translate3d(0, -8vh, 0) rotate(0deg); opacity: 0; }
  8% { opacity: 0.95; }
  100% { transform: translate3d(0, 115vh, 0) rotate(540deg); opacity: 0.95; }
}
@keyframes confettiSway {
  0%, 100% { margin-left: -8px; }
  50% { margin-left: 8px; }
}
@keyframes tapPromptPulse {
  0%, 100% { opacity: 0.5; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-3px); }
}
@keyframes titleGleam {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.03); filter: brightness(1.1); }
}
@keyframes tabContentFadeIn {
  0% { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}`;
