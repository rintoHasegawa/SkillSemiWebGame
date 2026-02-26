/**
 * useJoystickController
 * 入力イベントとジョイスティック計算結果の仲介を担うフック
 * useJoystickState の出力を受けて onInput 通知と終了時リセット通知を統一する
 */
import { useCallback } from "react";
import { useRef } from "react";
import type {
  JoystickPointerEvent,
  NormalizedInput,
  UseJoystickControllerProps,
  UseJoystickControllerReturn,
} from "./common";
import {
  JOYSTICK_MIN_MOVEMENT_DELTA,
  JOYSTICK_SEND_ZERO_ON_END,
} from "./common";
import { useJoystickState } from "./useJoystickState";

/** 入力イベントと通知処理を仲介するフック */
export const useJoystickController = ({
  onInput,
  maxDist,
}: UseJoystickControllerProps): UseJoystickControllerReturn => {
  const {
    isMoving,
    center,
    knobOffset,
    radius,
    handleStart,
    handleMove: baseHandleMove,
    handleEnd: baseHandleEnd,
  } = useJoystickState({ maxDist });

  const lastEmittedRef = useRef<NormalizedInput | null>(null);

  const emitInput = useCallback(
    (normalized: NormalizedInput) => {
      onInput(normalized.x, normalized.y);
    },
    [onInput],
  );

  const handleMove = useCallback(
    (e: JoystickPointerEvent) => {
      const normalized = baseHandleMove(e);
      if (!normalized) return;

      const last = lastEmittedRef.current;
      if (last) {
        const delta = Math.hypot(normalized.x - last.x, normalized.y - last.y);
        if (delta < JOYSTICK_MIN_MOVEMENT_DELTA) {
          return;
        }
      }

      emitInput(normalized);
      lastEmittedRef.current = normalized;
    },
    [baseHandleMove, emitInput],
  );

  const handleEnd = useCallback(
    (e: JoystickPointerEvent) => {
      baseHandleEnd(e);

      if (JOYSTICK_SEND_ZERO_ON_END) {
        emitInput({ x: 0, y: 0 });
        lastEmittedRef.current = { x: 0, y: 0 };
        return;
      }

      lastEmittedRef.current = null;
    },
    [baseHandleEnd, emitInput],
  );

  return {
    isMoving,
    center,
    knobOffset,
    radius,
    handleStart,
    handleMove,
    handleEnd,
  };
};
