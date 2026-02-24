/**
 * JoystickInputPresenter
 * ジョイスティック入力の受け取りと表示状態の橋渡しを担うプレゼンター
 * 入力イベントをコントローラーへ委譲し，描画用状態をViewへ渡す
 */
import { useJoystickController } from "./useJoystickController";
import { JoystickView } from "./JoystickView";
import type { UseJoystickInputPresenterProps } from "./common";

/** 入力半径の既定値を外部から参照できるように再公開 */
export { MAX_DIST } from "./common";

/** 入力と表示状態の橋渡しを行う */
export const JoystickInputPresenter = ({ onInput, maxDist }: UseJoystickInputPresenterProps) => {
  const { isMoving, center, knobOffset, radius, handleStart, handleMove, handleEnd } =
    useJoystickController({ onInput, maxDist });

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
      {/* 入力イベントをコントローラーへ渡し，描画用状態をViewへ渡す */}
      <JoystickView isActive={isMoving} center={center} knobOffset={knobOffset} radius={radius} />
    </div>
  );
};
