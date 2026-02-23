import { useCallback, useState } from "react";
import type React from "react";

export const MAX_DIST = 60;

type Props = {
  onMove: (moveX: number, moveY: number) => void;
  maxDist?: number;
};

type Point = { x: number; y: number };

type UseJoystickReturn = {
  isMoving: boolean;
  basePos: Point;
  stickPos: Point;
  handleStart: (e: React.TouchEvent | React.MouseEvent) => void;
  handleMove: (e: React.TouchEvent | React.MouseEvent) => void;
  handleEnd: () => void;
};

const getClientPoint = (e: React.TouchEvent | React.MouseEvent): Point | null => {
  if ("touches" in e) {
    const touch = e.touches[0];
    if (!touch) return null;
    return { x: touch.clientX, y: touch.clientY };
  }

  return { x: e.clientX, y: e.clientY };
};

export const useJoystick = ({ onMove, maxDist }: Props): UseJoystickReturn => {
  const [isMoving, setIsMoving] = useState(false);
  const [basePos, setBasePos] = useState<Point>({ x: 0, y: 0 });
  const [stickPos, setStickPos] = useState<Point>({ x: 0, y: 0 });
  const limit = maxDist ?? MAX_DIST;

  const handleStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const point = getClientPoint(e);
    if (!point) return;

    setBasePos(point);
    setStickPos({ x: 0, y: 0 });
    setIsMoving(true);
  }, []);

  const handleMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isMoving) return;
      const point = getClientPoint(e);
      if (!point) return;

      const dx = point.x - basePos.x;
      const dy = point.y - basePos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const limitedDist = Math.min(dist, limit);
      const offsetX = Math.cos(angle) * limitedDist;
      const offsetY = Math.sin(angle) * limitedDist;
      const normalizedX = offsetX / limit;
      const normalizedY = offsetY / limit;

      setStickPos({ x: offsetX, y: offsetY });
      onMove(normalizedX, normalizedY);
    },
    [isMoving, basePos.x, basePos.y, limit, onMove]
  );

  const handleEnd = useCallback(() => {
    setIsMoving(false);
    setStickPos({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  return { isMoving, basePos, stickPos, handleStart, handleMove, handleEnd };
};
