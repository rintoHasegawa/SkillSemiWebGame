/**
 * GameView
 * ゲーム画面の描画専用コンポーネント
 * タイマー表示，PixiJSの描画領域，入力UIの配置のみを担当する
 */
import React from "react";
import { JoystickInputPresenter } from "./input/joystick/JoystickInputPresenter";

/** 表示と入力に必要なプロパティ */
type Props = {
  timeLeft: string;
  pixiContainerRef: React.RefObject<HTMLDivElement>;
  onJoystickInput: (x: number, y: number) => void;
};

// --- スタイル定義（エラー回避のため、すべてこのファイル内で完結） ---

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
  pointerEvents: "none", // タイマーがジョイスティック操作を邪魔しないように
};

const PIXI_LAYER_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  zIndex: 1,
  // 💡 全機種で範囲を統一するための重要設定
  width: "100vw",
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const UI_LAYER_STYLE: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  zIndex: 20,
  width: "100%",
  height: "100%",
  // 💡 TypeScriptの型エラーを防ぐため "as const" を付与
  pointerEvents: "none" as const,
};

const JOYSTICK_AREA_STYLE: React.CSSProperties = {
  position: "absolute",
  width: "100%",
  height: "100%",
  pointerEvents: "auto" as const, // ジョイスティック操作だけを有効にする
};

/** タイマー表示用パーツ */
const TimerOverlay = ({ timeLeft }: { timeLeft: string }) => (
  <div style={TIMER_STYLE}>{timeLeft}</div>
);

/** 画面描画と入力UIをまとめて描画する */
export const GameView = ({
  timeLeft,
  pixiContainerRef,
  onJoystickInput,
}: Props) => {
  return (
    <div style={ROOT_STYLE}>
      {/* 1. タイマー（最前面付近） */}
      <TimerOverlay timeLeft={timeLeft} />

      {/* 2. ゲーム本体（PixiJS） */}
      <div ref={pixiContainerRef} style={PIXI_LAYER_STYLE} />

      {/* 3. 入力レイヤー（ジョイスティック） */}
      <div style={UI_LAYER_STYLE}>
        <div style={JOYSTICK_AREA_STYLE}>
          {/* ジョイスティックのファイルはいじらず、そのまま呼び出し */}
          <JoystickInputPresenter onInput={onJoystickInput} />
        </div>
      </div>
    </div>
  );
};
