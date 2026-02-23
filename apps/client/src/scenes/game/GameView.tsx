/**
 * GameView
 * ゲーム画面の描画専用コンポーネント
 * タイマー表示，PixiJSの描画領域，入力UIの配置のみを担当する
 */
import { JoystickInputLayer } from "./input/joystick/JoystickInputLayer";

/** 表示と入力に必要なプロパティ */
type Props = {
  timeLeft: string;
  pixiContainerRef: React.RefObject<HTMLDivElement>;
  onInput: (x: number, y: number) => void;
};

/** 画面描画と入力UIをまとめて描画する */
export const GameView = ({ timeLeft, pixiContainerRef, onInput }: Props) => {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#000",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* タイマーUIの表示 */}
      <div
        style={{
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
        }}
      >
        {timeLeft}
      </div>

      {/* PixiJS Canvas 配置領域 */}
      <div ref={pixiContainerRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }} />

      {/* UI 配置領域 */}
      <div style={{ position: "absolute", zIndex: 20, width: "100%", height: "100%" }}>
        <JoystickInputLayer onInput={onInput} />
      </div>
    </div>
  );
};
