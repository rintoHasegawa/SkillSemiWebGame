/**
 * GameView
 * ゲーム画面の描画専用コンポーネント
 * タイマー表示，PixiJSの描画領域，入力UIの配置のみを担当する
 */
import { JoystickInputPresenter } from "./input/joystick/JoystickInputPresenter";

/** 表示と入力に必要なプロパティ */
type Props = {
  timeLeft: string;
  pixiContainerRef: React.RefObject<HTMLDivElement>;
  onJoystickInput: (x: number, y: number) => void;
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

const UI_LAYER_STYLE: React.CSSProperties = {
  position: "absolute",
  zIndex: 20,
  width: "100%",
  height: "100%",
};

const TimerOverlay = ({ timeLeft }: { timeLeft: string }) => <div style={TIMER_STYLE}>{timeLeft}</div>;

/** 画面描画と入力UIをまとめて描画する */
export const GameView = ({ timeLeft, pixiContainerRef, onJoystickInput }: Props) => {
  return (
    <div style={ROOT_STYLE}>
      {/* タイマーUIの表示 */}
      <TimerOverlay timeLeft={timeLeft} />

      {/* PixiJS Canvas 配置領域 */}
      <div ref={pixiContainerRef} style={PIXI_LAYER_STYLE} />

      {/* UI 配置領域 */}
      <div style={UI_LAYER_STYLE}>
        <JoystickInputPresenter onInput={onJoystickInput} />
      </div>
    </div>
  );
};
