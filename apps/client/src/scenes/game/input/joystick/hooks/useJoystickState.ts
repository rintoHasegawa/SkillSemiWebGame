/**
 * useJoystickState
 * ジョイスティック入力状態の管理と入力ハンドラの提供を担うフック
 * UI描画に必要な中心点，ノブ位置，半径を保持する
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { JOYSTICK_DEADZONE, MAX_DIST } from "../common";
import { computeJoystick } from "../model/JoystickModel";
import type {
  JoystickPointerEvent,
  NormalizedInput,
  Point,
  UseJoystickStateProps,
  UseJoystickStateReturn,
} from "../common";

const getClientPoint = (e: JoystickPointerEvent): Point => {
  return { x: e.clientX, y: e.clientY };
};

const getPointerPoint = (event: PointerEvent): Point => {
  return { x: event.clientX, y: event.clientY };
};

const DEADZONE_STREAK_THRESHOLD = 3;
const POINTER_END_CONFIRM_MS = 80;
const DIRECT_END_CONFIRM_MS = 0;

/** ジョイスティック入力状態と入力ハンドラを提供する */
export const useJoystickState = ({
  maxDist,
  onNormalizedInput,
}: UseJoystickStateProps): UseJoystickStateReturn => {
  const [isMoving, setIsMoving] = useState(false);
  const [center, setCenter] = useState<Point>({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState<Point>({ x: 0, y: 0 });
  const activePointerIdRef = useRef<number | null>(null);
  const activePointerTypeRef = useRef<string | null>(null);
  const capturedElementRef = useRef<HTMLDivElement | null>(null);
  const deadzoneStreakRef = useRef(0);
  const pendingEndTimerIdRef = useRef<number | null>(null);
  const pendingEndPointerIdRef = useRef<number | null>(null);
  const radius = maxDist ?? MAX_DIST;

  const clearPendingEnd = useCallback(() => {
    if (pendingEndTimerIdRef.current !== null) {
      window.clearTimeout(pendingEndTimerIdRef.current);
      pendingEndTimerIdRef.current = null;
    }
    pendingEndPointerIdRef.current = null;
  }, []);

  const reset = useCallback(() => {
    clearPendingEnd();
    if (
      capturedElementRef.current !== null &&
      activePointerIdRef.current !== null &&
      capturedElementRef.current.hasPointerCapture(activePointerIdRef.current)
    ) {
      try {
        capturedElementRef.current.releasePointerCapture(activePointerIdRef.current);
      } catch {
        // capture の解放失敗時も入力状態リセットを優先する
      }
    }
    capturedElementRef.current = null;
    activePointerIdRef.current = null;
    activePointerTypeRef.current = null;
    deadzoneStreakRef.current = 0;
    setIsMoving(false);
    setKnobOffset({ x: 0, y: 0 });
  }, [clearPendingEnd]);

  const confirmPointerEnd = useCallback(
    (pointerId: number) => {
      if (activePointerIdRef.current !== pointerId) {
        return;
      }

      onNormalizedInput?.({ x: 0, y: 0 });
      reset();
    },
    [onNormalizedInput, reset],
  );

  const schedulePointerEnd = useCallback(
    (pointerId: number, confirmDelayMs: number) => {
      if (confirmDelayMs <= 0) {
        clearPendingEnd();
        confirmPointerEnd(pointerId);
        return;
      }

      if (
        pendingEndPointerIdRef.current === pointerId &&
        pendingEndTimerIdRef.current !== null
      ) {
        return;
      }

      clearPendingEnd();
      pendingEndPointerIdRef.current = pointerId;
      pendingEndTimerIdRef.current = window.setTimeout(() => {
        pendingEndTimerIdRef.current = null;
        pendingEndPointerIdRef.current = null;
        confirmPointerEnd(pointerId);
      }, confirmDelayMs);
    },
    [clearPendingEnd, confirmPointerEnd],
  );

  const applyNormalizedInput = useCallback(
    (
      normalized: NormalizedInput,
      knob: Point,
      allowPendingEndCancellation: boolean = true,
    ) => {
      setKnobOffset(knob);

      if (allowPendingEndCancellation && pendingEndPointerIdRef.current !== null) {
        clearPendingEnd();
      }

      onNormalizedInput?.(normalized);
    },
    [clearPendingEnd, onNormalizedInput],
  );

  const handleStart = useCallback((e: JoystickPointerEvent) => {
    if (activePointerIdRef.current !== null) {
      return;
    }

    const point = getClientPoint(e);
    if (point.x > window.innerWidth / 2) {
      return;
    }

    activePointerIdRef.current = e.pointerId;
    activePointerTypeRef.current = e.pointerType;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
      capturedElementRef.current = e.currentTarget;
    } catch {
      capturedElementRef.current = null;
    }
    deadzoneStreakRef.current = 0;
    clearPendingEnd();
    setCenter(point);
    setKnobOffset({ x: 0, y: 0 });
    setIsMoving(true);
  }, [clearPendingEnd]);

  const handleMove = useCallback(
    (e: JoystickPointerEvent) => {
      if (!isMoving || activePointerIdRef.current !== e.pointerId) {
        return null;
      }

      const point = getClientPoint(e);

      const computed = computeJoystick(center, point, radius);
      const allowPendingEndCancellation =
        e.pointerType !== "mouse" || e.buttons !== 0;

      const magnitude = Math.hypot(
        computed.normalized.x,
        computed.normalized.y,
      );
      if (magnitude < JOYSTICK_DEADZONE) {
        deadzoneStreakRef.current += 1;
        if (deadzoneStreakRef.current < DEADZONE_STREAK_THRESHOLD) {
          return null;
        }

        const zero = { x: 0, y: 0 };
        applyNormalizedInput(zero, zero, allowPendingEndCancellation);
        return zero;
      }

      deadzoneStreakRef.current = 0;

      applyNormalizedInput(
        computed.normalized,
        computed.knobOffset,
        allowPendingEndCancellation,
      );
      return computed.normalized;
    },
    [
      applyNormalizedInput,
      isMoving,
      center.x,
      center.y,
      radius,
    ],
  );

  const handleWindowPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isMoving || activePointerIdRef.current !== event.pointerId) {
        return;
      }

      const point = getPointerPoint(event);
      const computed = computeJoystick(center, point, radius);
      const allowPendingEndCancellation =
        event.pointerType !== "mouse" || event.buttons !== 0;
      const magnitude = Math.hypot(
        computed.normalized.x,
        computed.normalized.y,
      );

      if (magnitude < JOYSTICK_DEADZONE) {
        deadzoneStreakRef.current += 1;
        if (deadzoneStreakRef.current < DEADZONE_STREAK_THRESHOLD) {
          return;
        }

        const zero = { x: 0, y: 0 };
        applyNormalizedInput(zero, zero, allowPendingEndCancellation);
        return;
      }

      deadzoneStreakRef.current = 0;

      applyNormalizedInput(
        computed.normalized,
        computed.knobOffset,
        allowPendingEndCancellation,
      );
    },
    [
      applyNormalizedInput,
      isMoving,
      center.x,
      center.y,
      radius,
    ],
  );

  const handleEnd = useCallback(
    (e: JoystickPointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) {
        return;
      }

      if (e.type === "pointercancel" || e.type === "lostpointercapture") {
        schedulePointerEnd(e.pointerId, DIRECT_END_CONFIRM_MS);
        return;
      }

      if (e.type !== "pointerup") {
        return;
      }

      schedulePointerEnd(e.pointerId, DIRECT_END_CONFIRM_MS);
    },
    [schedulePointerEnd],
  );

  const handleWindowPointerEnd = useCallback(
    (event: PointerEvent) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      if (event.type === "pointercancel") {
        schedulePointerEnd(event.pointerId, DIRECT_END_CONFIRM_MS);
        return;
      }

      if (event.type !== "pointerup") {
        return;
      }

      schedulePointerEnd(event.pointerId, DIRECT_END_CONFIRM_MS);
    },
    [schedulePointerEnd],
  );

  const handleWindowMouseUp = useCallback(() => {
    if (activePointerTypeRef.current !== "mouse") {
      return;
    }

    const activePointerId = activePointerIdRef.current;
    if (activePointerId === null) {
      return;
    }

    schedulePointerEnd(activePointerId, DIRECT_END_CONFIRM_MS);
  }, [schedulePointerEnd]);

  const handleDocumentMouseUp = useCallback(() => {
    if (activePointerTypeRef.current !== "mouse") {
      return;
    }

    const activePointerId = activePointerIdRef.current;
    if (activePointerId === null) {
      return;
    }

    schedulePointerEnd(activePointerId, DIRECT_END_CONFIRM_MS);
  }, [schedulePointerEnd]);

  useEffect(() => {
    const handleWindowBlur = () => {
      if (activePointerTypeRef.current !== "mouse") {
        return;
      }

      const activePointerId = activePointerIdRef.current;
      if (activePointerId === null) {
        return;
      }

      // blur で pointerup を取り逃した場合に備えて，短い遅延で終了を予約する
      schedulePointerEnd(activePointerId, POINTER_END_CONFIRM_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        reset();
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [reset, schedulePointerEnd]);

  useEffect(() => {
    if (!isMoving) {
      return;
    }

    window.addEventListener("pointermove", handleWindowPointerMove, true);
    window.addEventListener("pointerup", handleWindowPointerEnd, true);
    window.addEventListener("pointercancel", handleWindowPointerEnd, true);
    window.addEventListener("mouseup", handleWindowMouseUp, true);
    document.addEventListener("mouseup", handleDocumentMouseUp, true);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove, true);
      window.removeEventListener("pointerup", handleWindowPointerEnd, true);
      window.removeEventListener("pointercancel", handleWindowPointerEnd, true);
      window.removeEventListener("mouseup", handleWindowMouseUp, true);
      document.removeEventListener("mouseup", handleDocumentMouseUp, true);
    };
  }, [
    handleDocumentMouseUp,
    handleWindowMouseUp,
    handleWindowPointerEnd,
    handleWindowPointerMove,
    isMoving,
  ]);

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
