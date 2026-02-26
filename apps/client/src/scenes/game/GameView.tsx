/**
 * GameView
 * ゲーム画面の描画専用コンポーネント
 * タイマー表示，PixiJSの描画領域，入力UIの配置のみを担当する
 */
import { GameInputOverlay } from "./input/GameInputOverlay";
import {
  PIXI_LAYER_STYLE,
  ROOT_STYLE,
  START_COUNTDOWN_STYLE,
  TIMER_STYLE,
} from "./styles/GameView.styles";

/** 表示と入力に必要なプロパティ */
type Props = {
  timeLeft: string;
  startCountdownText: string | null;
  isInputEnabled: boolean;
  pixiContainerRef: React.RefObject<HTMLDivElement>;
  onJoystickInput: (x: number, y: number) => void;
  onPlaceBomb: () => boolean;
};

const TimerOverlay = ({ timeLeft }: { timeLeft: string }) => (
  <div style={TIMER_STYLE}>{timeLeft}</div>
);

/** 画面描画と入力UIをまとめて描画する */
export const GameView = ({
  timeLeft,
  startCountdownText,
  isInputEnabled,
  pixiContainerRef,
  onJoystickInput,
  onPlaceBomb,
}: Props) => {
  return (
    <div style={ROOT_STYLE}>
      {/* タイマーUIの表示 */}
      <TimerOverlay timeLeft={timeLeft} />

      {startCountdownText && (
        <div style={START_COUNTDOWN_STYLE}>{startCountdownText}</div>
      )}

      {/* PixiJS Canvas 配置領域 */}
      <div ref={pixiContainerRef} style={PIXI_LAYER_STYLE} />

      {/* 入力UI レイヤー */}
      <GameInputOverlay
        isInputEnabled={isInputEnabled}
        onJoystickInput={onJoystickInput}
        onPlaceBomb={onPlaceBomb}
      />
    </div>
  );
};
