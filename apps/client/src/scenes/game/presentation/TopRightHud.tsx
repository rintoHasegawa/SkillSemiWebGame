/**
 * TopRightHud
 * 右上HUDの描画責務を担うプレゼンテーションコンポーネント
 * ミニマップとチーム塗り率パネルを横並びで表示する
 */
import { config } from "@client/config";
import { MiniMapPanel } from "@client/scenes/game/input/minimap/presentation/MiniMapPanel";
import {
  GAME_VIEW_PAINT_RATE_ITEM_STYLE,
  GAME_VIEW_PAINT_RATE_PANEL_STYLE,
  GAME_VIEW_PAINT_RATE_SQUARE_STYLE,
  GAME_VIEW_TOP_RIGHT_OVERLAY_STYLE,
} from "@client/scenes/game/styles/GameView.styles";

/** TopRightHud の入力プロパティ */
export type TopRightHudProps = {
  teamPaintRates: number[];
  remainingSeconds: number;
  miniMapTeamIds: number[];
  localPlayerPosition: { x: number; y: number } | null;
};

const TeamPaintRateOverlay = ({
  teamPaintRates,
  remainingSeconds,
}: {
  teamPaintRates: number[];
  remainingSeconds: number;
}) => {
  const shouldMaskPaintRate = remainingSeconds <= 30;

  return (
    <div style={GAME_VIEW_PAINT_RATE_PANEL_STYLE}>
      {teamPaintRates.map((rate, index) => (
        <div
          key={`team-paint-rate-${index}`}
          style={GAME_VIEW_PAINT_RATE_ITEM_STYLE}
        >
          <span
            style={{
              ...GAME_VIEW_PAINT_RATE_SQUARE_STYLE,
              color: config.GAME_CONFIG.TEAM_COLORS[index] ?? "#ffffff",
            }}
          >
            ■
          </span>
          <span>{shouldMaskPaintRate ? "???%" : `${Math.round(rate)}%`}</span>
        </div>
      ))}
    </div>
  );
};

/** 右上HUDを描画する */
export const TopRightHud = ({
  teamPaintRates,
  remainingSeconds,
  miniMapTeamIds,
  localPlayerPosition,
}: TopRightHudProps) => {
  return (
    <div style={GAME_VIEW_TOP_RIGHT_OVERLAY_STYLE}>
      <MiniMapPanel
        miniMapTeamIds={miniMapTeamIds}
        localPlayerPosition={localPlayerPosition}
      />
      <TeamPaintRateOverlay
        teamPaintRates={teamPaintRates}
        remainingSeconds={remainingSeconds}
      />
    </div>
  );
};
