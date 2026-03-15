/**
 * useJoystickController
 * 入力イベントとジョイスティック計算結果の仲介を担うフック
 * useJoystickState の出力を受けて onInput 通知と終了時リセット通知を統一する
 */
import { useCallback, useRef } from "react";
import type {
  JoystickPointerEvent,
  NormalizedInput,
  UseJoystickControllerProps,
  UseJoystickControllerReturn,
} from "../common";
import {
  JOYSTICK_MIN_MOVEMENT_DELTA,
} from "../common";
import { useJoystickState } from "./useJoystickState";

const isJoystickDebugEnabled = (): boolean => {
  if (import.meta.env.DEV) {
    try {
      return window.localStorage.getItem("debug:joystick") !== "0";
    } catch {
      return true;
    }
  }

  try {
    return window.localStorage.getItem("debug:joystick") === "1";
  } catch {
    return false;
  }
};

const debugJoystick = (label: string, payload?: unknown): void => {
  if (!isJoystickDebugEnabled()) {
    return;
  }

  if (payload === undefined) {
    console.log(`[joystick-controller] ${label}`);
    return;
  }

  console.log(`[joystick-controller] ${label}`, payload);
};

/** 入力イベントと通知処理を仲介するフック */
export const useJoystickController = ({
  onInput,
  maxDist,
}: UseJoystickControllerProps): UseJoystickControllerReturn => {
  const lastEmittedRef = useRef<NormalizedInput | null>(null);

  const emitInput = useCallback(
    (normalized: NormalizedInput) => {
      debugJoystick("emit", normalized);
      onInput(normalized.x, normalized.y);
    },
    [onInput],
  );

  const emitInputIfChanged = useCallback(
    (normalized: NormalizedInput) => {
      const last = lastEmittedRef.current;
      if (last) {
        const delta = Math.hypot(normalized.x - last.x, normalized.y - last.y);
        if (delta < JOYSTICK_MIN_MOVEMENT_DELTA) {
          debugJoystick("skip-small-delta", {
            normalized,
            last,
            delta,
            threshold: JOYSTICK_MIN_MOVEMENT_DELTA,
          });
          return;
        }
      }

      emitInput(normalized);
      lastEmittedRef.current = normalized;
    },
    [emitInput],
  );

  const {
    isMoving,
    center,
    knobOffset,
    radius,
    handleStart,
    handleMove: baseHandleMove,
    handleEnd: baseHandleEnd,
    reset: baseReset,
  } = useJoystickState({ maxDist, onNormalizedInput: emitInputIfChanged });

  const handleMove = useCallback(
    (e: JoystickPointerEvent) => {
      baseHandleMove(e);
    },
    [baseHandleMove],
  );

  const handleEnd = useCallback(
    (e: JoystickPointerEvent) => {
      baseHandleEnd(e);
    },
    [baseHandleEnd],
  );

  const reset = useCallback(() => {
    baseReset();
    emitInputIfChanged({ x: 0, y: 0 });
  }, [baseReset, emitInputIfChanged]);

  return {
    isMoving,
    center,
    knobOffset,
    radius,
    handleStart,
    handleMove,
    handleEnd,
    reset,
  };
};
