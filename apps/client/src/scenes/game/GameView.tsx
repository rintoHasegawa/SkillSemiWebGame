/**
 * GameView
 * ゲーム画面の描画専用コンポーネント
 * タイマー表示，PixiJSの描画領域，入力UIの配置のみを担当する
 */
import { GameInputOverlay } from "./input/GameInputOverlay";
import {
  GameSceneInitStatus,
  type GameSceneInitStatusType,
} from "./hooks/application/sceneControllerReducer";
import {
  GAME_VIEW_HP_GAUGE_STYLE,
  GAME_VIEW_FEVER_TEXT_STYLE,
  GAME_VIEW_HURRICANE_WARNING_STYLE,
  GAME_VIEW_PIXI_LAYER_STYLE,
  GAME_VIEW_ROOT_STYLE,
  GAME_VIEW_START_COUNTDOWN_STYLE,
  GAME_VIEW_TIMER_STYLE,
} from "./styles/GameView.styles";
import { config } from "@client/config";
import { buildRespawnHeartGauge } from "./input/presentation/GameUiPresenter";
import { GameInitErrorOverlay } from "./presentation/GameInitErrorOverlay";
import { TopRightHud } from "./presentation/TopRightHud";
import { shouldShowFeverBanner } from "./presentation/shouldShowFeverBanner";

/** 表示と入力に必要なプロパティ */
type Props = {
  timeLeft: string;
  startCountdownText: string | null;
  isInputEnabled: boolean;
  isBombEnabled: boolean;
  teamPaintRates: number[];
  miniMapTeamIds: number[];
  localBombHitCount: number;
  localPlayerPosition: { x: number; y: number } | null;
  isFeverTime: boolean;
  initStatus: GameSceneInitStatusType;
  pixiContainerRef: React.RefObject<HTMLDivElement | null>;
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

/** 画面描画と入力UIをまとめて描画する */
export const GameView = ({
  timeLeft,
  startCountdownText,
  isInputEnabled,
  isBombEnabled,
  teamPaintRates,
  miniMapTeamIds,
  localBombHitCount,
  localPlayerPosition,
  isFeverTime,
  initStatus,
  pixiContainerRef,
  onJoystickInput,
  onPlaceBomb,
}: Props) => {
  const remainingSeconds = parseRemainingSeconds(timeLeft);
  const heartGauge = buildRespawnHeartGauge(localBombHitCount);

  return (
    <div style={GAME_VIEW_ROOT_STYLE}>
      <style>{`@keyframes timerUrgentBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.35; } } @keyframes feverPulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.05); } } @keyframes hurricaneWarningBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.5; } }`}</style>
      {/* タイマーUIの表示 */}
      <TimerOverlay timeLeft={timeLeft} />
      <div style={GAME_VIEW_HP_GAUGE_STYLE}>HP: {heartGauge}</div>
      <TopRightHud
        teamPaintRates={teamPaintRates}
        remainingSeconds={remainingSeconds}
        miniMapTeamIds={miniMapTeamIds}
        localPlayerPosition={localPlayerPosition}
      />

      {shouldShowFeverBanner({ isFeverTime, remainingSeconds }) && (
        <div style={GAME_VIEW_FEVER_TEXT_STYLE}>！Fever Time！</div>
      )}

      {config.GAME_CONFIG.HURRICANE_ENABLED &&
        remainingSeconds ===
          config.GAME_CONFIG.HURRICANE_SPAWN_REMAINING_SEC && (
          <div style={GAME_VIEW_HURRICANE_WARNING_STYLE}>
            WARNING：ハリケーン出現
          </div>
        )}

      {startCountdownText && (
        <div style={GAME_VIEW_START_COUNTDOWN_STYLE}>{startCountdownText}</div>
      )}

      {/* PixiJS Canvas 配置領域 */}
      <div ref={pixiContainerRef} style={GAME_VIEW_PIXI_LAYER_STYLE} />

      {/* 入力UI レイヤー */}
      <GameInputOverlay
        isInputEnabled={isInputEnabled}
        isBombEnabled={isBombEnabled}
        isFeverTime={isFeverTime}
        onJoystickInput={onJoystickInput}
        onPlaceBomb={onPlaceBomb}
      />

      {/* 初期化失敗時のエラー表示 */}
      {initStatus === GameSceneInitStatus.FAILED && <GameInitErrorOverlay />}
    </div>
  );
};
