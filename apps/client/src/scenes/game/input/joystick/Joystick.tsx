/**
 * Joystick
 * 画面上のジョイスティックUIの入口
 * ポインターイベントを受け取り，useJoystick に処理を委譲し，描画は JoystickView に渡す
 */
import { JoystickView } from "./JoystickView";
import { MAX_DIST, useJoystick } from "./useJoystick";

/** 入力半径の既定値を外部から参照できるように再公開 */
export { MAX_DIST } from "./useJoystick";

/** Joystick コンポーネントの入力コールバック */
type Props = {
  onInput: (moveX: number, moveY: number) => void;
};

/** ポインター入力と描画を結びつけるジョイスティックUI */
export const Joystick = ({ onInput }: Props) => {
  const { isMoving, center, knobOffset, radius, handleStart, handleMove, handleEnd } =
    useJoystick({ onInput });

  return (
    <div
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        // キャンバス前面入力キャプチャレイヤー
        zIndex: 10,
        touchAction: "none",
      }}
    >
      {/* 見た目のみの描画（入力は扱わない） */}
      <JoystickView
        isActive={isMoving}
        center={center}
        knobOffset={knobOffset}
        radius={radius ?? MAX_DIST}
      />
    </div>
  );
};