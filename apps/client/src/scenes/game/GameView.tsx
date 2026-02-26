/**
 * GameView
 * ゲーム画面の描画専用コンポーネント
 * タイマー表示，PixiJSの描画領域，入力UIの配置のみを担当する
 */
import { GameInputOverlay } from "./input/GameInputOverlay";

/** 表示と入力に必要なプロパティ */
type Props = {
  timeLeft: string;
  startCountdownText: string | null;
  pixiContainerRef: React.RefObject<HTMLDivElement>;
  onJoystickInput: (x: number, y: number) => void;
  onPlaceBomb: () => void;
};

const ROOT_STYLE: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  overflow: "hidden",
  position: "relative",
  backgroundColor: "#000",
  userSelect: "none",
  WebkitUserSelect: "none",
};

const TIMER_STYLE: React.CSSProperties = {
  position: "absolute",
  top: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 10,
  color: "white",
  fontSize: "32px",
  fontWeight: "bold",
  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
  fontFamily: "monospace",
  userSelect: "none",
  WebkitUserSelect: "none",
};

const PIXI_LAYER_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  zIndex: 1,
};

const START_COUNTDOWN_STYLE: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 30,
  color: "white",
  fontSize: "clamp(3rem, 14vw, 8rem)",
  fontWeight: 900,
  textShadow: "0 0 16px rgba(0,0,0,0.85)",
  fontFamily: "monospace",
  userSelect: "none",
  WebkitUserSelect: "none",
  pointerEvents: "none",
};

const TimerOverlay = ({ timeLeft }: { timeLeft: string }) => (
  <div style={TIMER_STYLE}>{timeLeft}</div>
);

/** 画面描画と入力UIをまとめて描画する */
export const GameView = ({
  timeLeft,
  startCountdownText,
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
        onJoystickInput={onJoystickInput}
        onPlaceBomb={onPlaceBomb}
      />
    </div>
  );
};
