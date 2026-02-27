/**
 * GameView
 * ゲーム画面の描画専用コンポーネント
 * タイマー表示，PixiJSの描画領域，入力UIの配置のみを担当する
 */
import { GameInputOverlay } from "./input/GameInputOverlay";
import {
  GAME_VIEW_FEVER_TEXT_STYLE,
  GAME_VIEW_PAINT_RATE_ITEM_STYLE,
  GAME_VIEW_PAINT_RATE_PANEL_STYLE,
  GAME_VIEW_PAINT_RATE_SQUARE_STYLE,
  GAME_VIEW_PIXI_LAYER_STYLE,
  GAME_VIEW_ROOT_STYLE,
  GAME_VIEW_START_COUNTDOWN_STYLE,
  GAME_VIEW_TIMER_STYLE,
} from "./styles/GameView.styles";
import { config } from "@client/config";

/** 表示と入力に必要なプロパティ */
type Props = {
  timeLeft: string;
  startCountdownText: string | null;
  isInputEnabled: boolean;
  teamPaintRates: number[];
  pixiContainerRef: React.RefObject<HTMLDivElement>;
  onJoystickInput: (x: number, y: number) => void;
  onPlaceBomb: () => boolean;
};

const parseRemainingSeconds = (timeLeft: string): number => {
  const [minutesText, secondsText] = timeLeft.split(":");
  const minutes = Number(minutesText);
  const seconds = Number(secondsText);

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return Number.POSITIVE_INFINITY;
  }

  return minutes * 60 + seconds;
};

const TimerOverlay = ({ timeLeft }: { timeLeft: string }) => {
  const remainingSeconds = parseRemainingSeconds(timeLeft);

  return (
    <div
      style={{
        ...GAME_VIEW_TIMER_STYLE,
        color: remainingSeconds <= 30 ? "#8B0000" : GAME_VIEW_TIMER_STYLE.color,
        animation:
          remainingSeconds <= 10
            ? "timerUrgentBlink 1s step-end infinite"
            : "none",
      }}
    >
      {timeLeft}
    </div>
  );
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

/** 画面描画と入力UIをまとめて描画する */
export const GameView = ({
  timeLeft,
  startCountdownText,
  isInputEnabled,
  teamPaintRates,
  pixiContainerRef,
  onJoystickInput,
  onPlaceBomb,
}: Props) => {
  const remainingSeconds = parseRemainingSeconds(timeLeft);
  const isFeverTime =
    remainingSeconds <= config.GAME_CONFIG.BOMB_FEVER_START_REMAINING_SEC;

  return (
    <div style={GAME_VIEW_ROOT_STYLE}>
      <style>{`@keyframes timerUrgentBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.35; } } @keyframes feverPulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.05); } }`}</style>
      {/* タイマーUIの表示 */}
      <TimerOverlay timeLeft={timeLeft} />
      <TeamPaintRateOverlay
        teamPaintRates={teamPaintRates}
        remainingSeconds={remainingSeconds}
      />

      {remainingSeconds === 60 && (
        <div style={GAME_VIEW_FEVER_TEXT_STYLE}>！Fever Tieme！</div>
      )}

      {startCountdownText && (
        <div style={GAME_VIEW_START_COUNTDOWN_STYLE}>{startCountdownText}</div>
      )}

      {/* PixiJS Canvas 配置領域 */}
      <div ref={pixiContainerRef} style={GAME_VIEW_PIXI_LAYER_STYLE} />

      {/* 入力UI レイヤー */}
      <GameInputOverlay
        isInputEnabled={isInputEnabled}
        isFeverTime={isFeverTime}
        onJoystickInput={onJoystickInput}
        onPlaceBomb={onPlaceBomb}
      />
    </div>
  );
};
