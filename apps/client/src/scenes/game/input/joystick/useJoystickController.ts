/**
 * useJoystickController
 * 入力イベントとジョイスティック計算結果の仲介を担うフック
 * useJoystickState の出力を受けて onInput 通知と終了時リセット通知を統一する
 */
import { useCallback } from 'react';
import type React from 'react';
import type { NormalizedInput, Point } from './common';
import { useJoystickState } from './useJoystickState';

/** フックに渡す入力設定 */
type Props = {
  onInput: (moveX: number, moveY: number) => void;
  maxDist?: number;
};

/** フックが返す描画状態と入力ハンドラ */
type UseJoystickControllerReturn = {
  isMoving: boolean;
  center: Point;
  knobOffset: Point;
  radius: number;
  handleStart: (e: React.TouchEvent | React.MouseEvent) => void;
  handleMove: (e: React.TouchEvent | React.MouseEvent) => void;
  handleEnd: () => void;
};

/** 入力イベントと通知処理を仲介するフック */
export const useJoystickController = ({ onInput, maxDist }: Props): UseJoystickControllerReturn => {
  const {
    isMoving,
    center,
    knobOffset,
    radius,
    handleStart,
    handleMove: baseHandleMove,
    handleEnd: baseHandleEnd,
  } = useJoystickState({ maxDist });

  const emitInput = useCallback(
    (normalized: NormalizedInput) => {
      onInput(normalized.x, normalized.y);
    },
    [onInput]
  );

  const handleMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const normalized = baseHandleMove(e);
      if (!normalized) return;
      emitInput(normalized);
    },
    [baseHandleMove, emitInput]
  );

  const handleEnd = useCallback(() => {
    baseHandleEnd();
    emitInput({ x: 0, y: 0 });
  }, [baseHandleEnd, emitInput]);

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
