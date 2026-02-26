/**
 * JoystickInputPresenter
 * ジョイスティック入力の受け取りと表示状態の橋渡しを担うプレゼンター
 * 入力イベントをコントローラーへ委譲し，描画用状態をViewへ渡す
 */
import { useEffect } from "react";
import { useJoystickController } from "../hooks/useJoystickController";
import { JoystickView } from "./JoystickView.tsx";
import type { UseJoystickInputPresenterProps } from "../common";
import { buildJoystickInputLayerStyle } from "./JoystickInputPresenter.styles";

/** 入力と表示状態の橋渡しを行う */
export const JoystickInputPresenter = ({
  onInput,
  maxDist,
  isEnabled = true,
}: UseJoystickInputPresenterProps) => {
  const {
    isMoving,
    center,
    knobOffset,
    radius,
    handleStart,
    handleMove,
    handleEnd,
    reset,
  } = useJoystickController({ onInput, maxDist });

  useEffect(() => {
    if (isEnabled) {
      return;
    }

    reset();
  }, [isEnabled, reset]);

  const layerStyle = buildJoystickInputLayerStyle(isEnabled);

  return (
    <div
      onPointerDown={isEnabled ? handleStart : undefined}
      onPointerMove={isEnabled ? handleMove : undefined}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
      onLostPointerCapture={handleEnd}
      style={layerStyle}
    >
      <JoystickView
        isActive={isMoving}
        center={center}
        knobOffset={knobOffset}
        radius={radius}
      />
    </div>
  );
};
