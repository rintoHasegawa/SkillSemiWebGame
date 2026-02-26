/**
 * ResultScene
 * ゲーム終了後の順位一覧を表示する結果画面コンポーネント
 * 順位，チーム名，塗り率の3項目をテーブル形式で描画する
 */
import type { GameResultPayload } from "@repo/shared";
import type { CSSProperties } from "react";
import { config } from "../../config";

type Props = {
  result: GameResultPayload | null;
  onBackToTitle: () => void;
};

const formatPaintRate = (value: number): string => `${value.toFixed(1)}%`;

const ROW_GRID_TEMPLATE = "120px 1fr 180px";

const ROOT_STYLE: CSSProperties = {
  width: "100vw",
  height: "100dvh",
  position: "relative",
  overflow: "hidden",
  background: "#111",
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "24px",
  boxSizing: "border-box",
};

const TITLE_STYLE: CSSProperties = {
  margin: "0 0 20px 0",
  fontSize: "clamp(1.8rem, 4.4vw, 2.6rem)",
  fontFamily: "'Yu Mincho', 'Hiragino Mincho ProN', serif",
  letterSpacing: "0.14em",
  fontWeight: 800,
  textShadow: "0 4px 14px rgba(0, 0, 0, 0.5)",
  animation: "titleGleam 3.6s ease-in-out infinite",
};

const getTitleTextStyle = (winnerColor: string): CSSProperties => ({
  display: "inline-block",
  background: `linear-gradient(120deg, #FFF8D9 0%, #FFD95A 42%, ${winnerColor} 100%)`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
  WebkitTextStroke: "1px rgba(255, 255, 255, 0.22)",
  filter: "drop-shadow(0 0 8px rgba(255, 220, 120, 0.35))",
});

const CONTENT_STYLE: CSSProperties = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  position: "relative",
  zIndex: 1,
};

const EFFECT_LAYER_BASE_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

const CONFETTI_LAYER_STYLE: CSSProperties = {
  ...EFFECT_LAYER_BASE_STYLE,
  overflow: "hidden",
  zIndex: 0,
};

const BACKGROUND_IMAGE_LAYER_STYLE: CSSProperties = {
  ...EFFECT_LAYER_BASE_STYLE,
  backgroundImage: "url('/LobbyAni.webp')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  opacity: 0.45,
};

const BACKGROUND_DARK_OVERLAY_STYLE: CSSProperties = {
  ...EFFECT_LAYER_BASE_STYLE,
  background:
    "linear-gradient(180deg, rgba(0, 0, 0, 0.56) 0%, rgba(0, 0, 0, 0.72) 55%, rgba(0, 0, 0, 0.82) 100%)",
};

const getPulseLayerStyle = (
  winnerColorRgba: string,
  phase: "a" | "b",
): CSSProperties => ({
  ...EFFECT_LAYER_BASE_STYLE,
  background:
    phase === "a"
      ? `radial-gradient(circle at 25% 25%, ${winnerColorRgba} 0%, rgba(0, 0, 0, 0) 55%)`
      : `radial-gradient(circle at 80% 75%, ${winnerColorRgba} 0%, rgba(0, 0, 0, 0) 60%)`,
  opacity: phase === "a" ? 0.22 : 0.16,
  animation:
    phase === "a"
      ? "winnerPulseA 4.8s ease-in-out infinite"
      : "winnerPulseB 6.2s ease-in-out infinite",
});

const TABLE_STYLE: CSSProperties = {
  width: "100%",
  maxWidth: "720px",
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: "8px",
  overflow: "hidden",
  backdropFilter: "blur(2px)",
  background: "rgba(16, 16, 16, 0.62)",
};

const HEADER_ROW_STYLE: CSSProperties = {
  display: "grid",
  gridTemplateColumns: ROW_GRID_TEMPLATE,
  background: "#222",
  padding: "12px 16px",
  fontWeight: "bold",
};

const RIGHT_ALIGN_STYLE: CSSProperties = { textAlign: "right" };

const RATE_STYLE: CSSProperties = {
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const RANK_BASE_STYLE: CSSProperties = {
  fontFamily: "serif",
  fontWeight: 800,
  letterSpacing: "0.04em",
  fontVariantNumeric: "tabular-nums",
  fontSize: "1.15rem",
  textShadow: "0 2px 8px rgba(0, 0, 0, 0.42)",
};

const getRankStyle = (rank: number): CSSProperties => {
  if (rank === 1) {
    return {
      ...RANK_BASE_STYLE,
      color: "#FFD95A",
      textShadow:
        "0 0 10px rgba(255, 217, 90, 0.5), 0 2px 8px rgba(0, 0, 0, 0.42)",
    };
  }

  if (rank === 2) {
    return {
      ...RANK_BASE_STYLE,
      color: "#E2E8F0",
      textShadow:
        "0 0 8px rgba(226, 232, 240, 0.35), 0 2px 8px rgba(0, 0, 0, 0.42)",
    };
  }

  if (rank === 3) {
    return {
      ...RANK_BASE_STYLE,
      color: "#E7A977",
      textShadow:
        "0 0 8px rgba(231, 169, 119, 0.35), 0 2px 8px rgba(0, 0, 0, 0.42)",
    };
  }

  return {
    ...RANK_BASE_STYLE,
    color: "#F5F5F5",
  };
};

const TEAM_CELL_STYLE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
};

const getTeamColorDotStyle = (color: string): CSSProperties => ({
  width: "10px",
  height: "10px",
  borderRadius: "9999px",
  background: color,
  border: "1px solid rgba(255, 255, 255, 0.35)",
  flexShrink: 0,
});

const getBodyRowStyle = (index: number): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: ROW_GRID_TEMPLATE,
  padding: "12px 16px",
  borderTop: "1px solid #333",
  background: index % 2 === 0 ? "#171717" : "#1d1d1d",
});

const CONFETTI_COUNT = 36;

const getConfettiStyle = (
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

const toRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return `rgba(255, 255, 255, ${alpha})`;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if ([r, g, b].some((value) => Number.isNaN(value))) {
    return `rgba(255, 255, 255, ${alpha})`;
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** 最終結果データを受け取り，順位一覧を表示する */
export const ResultScene = ({ result, onBackToTitle }: Props) => {
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
  const winnerColorRgba = toRgba(winnerColor, 0.32);

  return (
    <div style={ROOT_STYLE}>
      <style>
        {`@keyframes winnerPulseA {
            0%, 100% { transform: scale(1); opacity: 0.18; }
            50% { transform: scale(1.07); opacity: 0.3; }
          }
          @keyframes winnerPulseB {
            0%, 100% { transform: scale(1); opacity: 0.12; }
            50% { transform: scale(1.12); opacity: 0.24; }
          }
          @keyframes confettiFall {
            0% { transform: translate3d(0, -8vh, 0) rotate(0deg); opacity: 0; }
            8% { opacity: 0.95; }
            100% { transform: translate3d(0, 115vh, 0) rotate(540deg); opacity: 0.95; }
          }
          @keyframes confettiSway {
            0%, 100% { margin-left: -8px; }
            50% { margin-left: 8px; }
          }
          @keyframes titleGleam {
            0%, 100% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.03); filter: brightness(1.1); }
          }`}
      </style>
      <div style={BACKGROUND_IMAGE_LAYER_STYLE} />
      <div style={BACKGROUND_DARK_OVERLAY_STYLE} />
      <div style={CONFETTI_LAYER_STYLE}>
        {Array.from({ length: CONFETTI_COUNT }, (_, index) => (
          <span
            key={`confetti-${index}`}
            style={getConfettiStyle(index, winnerColor)}
          />
        ))}
      </div>
      <div style={getPulseLayerStyle(winnerColorRgba, "a")} />
      <div style={getPulseLayerStyle(winnerColorRgba, "b")} />

      <div style={CONTENT_STYLE}>
        <button
          onClick={onBackToTitle}
          style={{
            alignSelf: "flex-start",
            marginBottom: "10px",
            padding: "10px 14px",
            fontSize: "0.95rem",
            cursor: "pointer",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.45)",
            background: "rgba(0,0,0,0.55)",
            color: "white",
            fontWeight: 700,
          }}
        >
          タイトルへ戻る
        </button>

        <h2 style={TITLE_STYLE}>
          <span style={getTitleTextStyle(winnerColor)}>結果発表</span>
        </h2>

        <div style={TABLE_STYLE}>
          <div style={HEADER_ROW_STYLE}>
            <span>順位</span>
            <span>チーム名</span>
            <span style={RIGHT_ALIGN_STYLE}>塗り率</span>
          </div>

          {result.rankings.map((row, index) => (
            <div key={`${row.teamId}-${index}`} style={getBodyRowStyle(index)}>
              <span style={getRankStyle(row.rank)}>{row.rank}位</span>
              <span style={TEAM_CELL_STYLE}>
                <span
                  style={getTeamColorDotStyle(
                    config.GAME_CONFIG.TEAM_COLORS[row.teamId] ?? "#888888",
                  )}
                />
                <span>{row.teamName}</span>
              </span>
              <span style={RATE_STYLE}>{formatPaintRate(row.paintRate)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
