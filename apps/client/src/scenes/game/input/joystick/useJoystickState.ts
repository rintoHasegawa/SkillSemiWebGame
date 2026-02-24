/**
 * useJoystickState
 * ジョイスティック入力状態の管理と入力ハンドラの提供を担うフック
 * UI描画に必要な中心点，ノブ位置，半径を保持する
 */
import { useCallback, useState } from 'react';
import { JOYSTICK_DEADZONE, MAX_DIST } from './common';
import { computeJoystick } from './JoystickModel';
import type {
  JoystickPointerEvent,
  Point,
  UseJoystickStateProps,
  UseJoystickStateReturn,
} from './common';

/** タッチとマウスからクライアント座標を共通化して取得する */
const getClientPoint = (e: JoystickPointerEvent): Point | null => {
  if ('touches' in e) {
    const touch = e.touches[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
  }

  return { x: e.clientX, y: e.clientY };
};

/** ジョイスティック入力状態と入力ハンドラを提供する */
export const useJoystickState = ({ maxDist }: UseJoystickStateProps): UseJoystickStateReturn => {
  const [isMoving, setIsMoving] = useState(false);
  const [center, setCenter] = useState<Point>({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState<Point>({ x: 0, y: 0 });
  const radius = maxDist ?? MAX_DIST;

  // 入力開始時の基準座標をセットする
  const handleStart = useCallback((e: JoystickPointerEvent) => {
    const point = getClientPoint(e);
    if (!point) return;

    setCenter(point);
    setKnobOffset({ x: 0, y: 0 });
    setIsMoving(true);
  }, []);

  // 入力座標からベクトルを計算し，半径でクランプして正規化する
  const handleMove = useCallback(
    (e: JoystickPointerEvent) => {
      if (!isMoving) return null;
      const point = getClientPoint(e);
      if (!point) return null;

      const computed = computeJoystick(center, point, radius);

      const magnitude = Math.hypot(computed.normalized.x, computed.normalized.y);
      if (magnitude < JOYSTICK_DEADZONE) {
        setKnobOffset({ x: 0, y: 0 });
        return { x: 0, y: 0 };
      }

      setKnobOffset(computed.knobOffset);
      return computed.normalized;
    },
    [isMoving, center.x, center.y, radius]
  );

  // 入力終了時に状態をリセットする
  const handleEnd = useCallback(() => {
    setIsMoving(false);
    setKnobOffset({ x: 0, y: 0 });
  }, []);

  return { isMoving, center, knobOffset, radius, handleStart, handleMove, handleEnd };
};
