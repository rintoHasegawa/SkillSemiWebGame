/**
 * useJoystick
 * ジョイスティック入力を受け取り，座標計算と正規化ベクトルの出力を行うフック
 * UI描画に必要な中心点・ノブ位置・半径も合わせて提供する
 */
import { useCallback, useState } from "react";
import type React from "react";

/** UI側と共有する最大半径の既定値 */
export const MAX_DIST = 60;

/** フックに渡す入力コールバックと設定 */
type Props = {
  onInput: (moveX: number, moveY: number) => void;
  maxDist?: number;
};

/** 2D座標の簡易型 */
type Point = { x: number; y: number };

/** フックが返すUI向けの状態とハンドラ */
type UseJoystickReturn = {
  isMoving: boolean;
  center: Point;
  knobOffset: Point;
  radius: number;
  handleStart: (e: React.TouchEvent | React.MouseEvent) => void;
  handleMove: (e: React.TouchEvent | React.MouseEvent) => void;
  handleEnd: () => void;
};

/** タッチとマウスからクライアント座標を共通化して取得 */
const getClientPoint = (e: React.TouchEvent | React.MouseEvent): Point | null => {
  if ("touches" in e) {
    const touch = e.touches[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
  }

  return { x: e.clientX, y: e.clientY };
};

/** 正規化ベクトルの出力とUI用の座標を提供するフック */
export const useJoystick = ({ onInput, maxDist }: Props): UseJoystickReturn => {
  const [isMoving, setIsMoving] = useState(false);
  const [center, setCenter] = useState<Point>({ x: 0, y: 0 });
  const [knobOffset, setKnobOffset] = useState<Point>({ x: 0, y: 0 });
  const radius = maxDist ?? MAX_DIST;

  // 入力開始時の基準座標をセットする
  const handleStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const point = getClientPoint(e);
    if (!point) return;

    setCenter(point);
    setKnobOffset({ x: 0, y: 0 });
    setIsMoving(true);
  }, []);

  // 入力座標からベクトルを計算し，半径でクランプして正規化出力する
  const handleMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isMoving) return;
      const point = getClientPoint(e);
      if (!point) return;

      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const limitedDist = Math.min(dist, radius);
      const offsetX = Math.cos(angle) * limitedDist;
      const offsetY = Math.sin(angle) * limitedDist;
      const normalizedX = offsetX / radius;
      const normalizedY = offsetY / radius;

      setKnobOffset({ x: offsetX, y: offsetY });
      onInput(normalizedX, normalizedY);
    },
    [isMoving, center.x, center.y, radius, onInput]
  );

  // 入力終了時に状態をリセットして停止入力を通知する
  const handleEnd = useCallback(() => {
    setIsMoving(false);
    setKnobOffset({ x: 0, y: 0 });
    onInput(0, 0);
  }, [onInput]);

  return { isMoving, center, knobOffset, radius, handleStart, handleMove, handleEnd };
};
