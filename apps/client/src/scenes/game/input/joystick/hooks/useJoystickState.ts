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
  Point,
  UseJoystickStateProps,
  UseJoystickStateReturn,
} from "../common";

const getClientPoint = (e: JoystickPointerEvent): Point | null => {
  return { x: e.clientX, y: e.clientY };
};

/** ジョイスティック入力状態と入力ハンドラを提供する */
export const useJoystickState = ({
  maxDist,
}: UseJoystickStateProps): UseJoystickStateReturn => {
  const [isMoving, setIsMoving] = useState(false);
  const [center, setCenter] = useState<Point>({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState<Point>({ x: 0, y: 0 });
  const activePointerIdRef = useRef<number | null>(null);
  const activePointerTargetRef = useRef<HTMLDivElement | null>(null);
  const radius = maxDist ?? MAX_DIST;

  const reset = useCallback(() => {
    const pointerId = activePointerIdRef.current;
    const pointerTarget = activePointerTargetRef.current;
    if (
      pointerId !== null
      && pointerTarget
      && pointerTarget.hasPointerCapture(pointerId)
    ) {
      pointerTarget.releasePointerCapture(pointerId);
    }

    activePointerIdRef.current = null;
    activePointerTargetRef.current = null;
    setIsMoving(false);
    setKnobOffset({ x: 0, y: 0 });
  }, []);

  const handleStart = useCallback((e: JoystickPointerEvent) => {
    if (activePointerIdRef.current !== null) return;

    const point = getClientPoint(e);
    if (!point) return;
    if (point.x > window.innerWidth / 2) return;

    activePointerIdRef.current = e.pointerId;
    activePointerTargetRef.current = e.currentTarget;
    e.currentTarget.setPointerCapture(e.pointerId);
    setCenter(point);
    setKnobOffset({ x: 0, y: 0 });
    setIsMoving(true);
  }, []);

  const handleMove = useCallback(
    (e: JoystickPointerEvent) => {
      if (!isMoving || activePointerIdRef.current !== e.pointerId) return null;
      const point = getClientPoint(e);
      if (!point) return null;

      const computed = computeJoystick(center, point, radius);

      const magnitude = Math.hypot(
        computed.normalized.x,
        computed.normalized.y,
      );
      if (magnitude < JOYSTICK_DEADZONE) {
        setKnobOffset({ x: 0, y: 0 });
        return { x: 0, y: 0 };
      }

      setKnobOffset(computed.knobOffset);
      return computed.normalized;
    },
    [isMoving, center.x, center.y, radius],
  );

  const handleEnd = useCallback(
    (e: JoystickPointerEvent) => {
      if (activePointerIdRef.current !== e.pointerId) return;

      reset();
    },
    [reset],
  );

  useEffect(() => {
    const handleWindowBlur = () => {
      reset();
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
  }, [reset]);

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
