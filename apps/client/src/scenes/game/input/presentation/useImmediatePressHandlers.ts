/**
 * useImmediatePressHandlers
 * タップ即時発火の押下イベントハンドラを生成するフック
 * pointerdown 起点で入力を確定し click の二重発火を抑止する
 */
import { useCallback } from "react";

/** 即時押下ハンドラ生成の入力プロパティ */
export type UseImmediatePressHandlersOptions = {
  stopPropagation?: boolean;
};

/** pointerdown と click 抑止のハンドラを生成する */
export const useImmediatePressHandlers = <T extends HTMLElement>(
  onPress: () => void,
  options?: UseImmediatePressHandlersOptions,
) => {
  const stopPropagation = options?.stopPropagation ?? true;

  const onPointerDown = useCallback(
    (event: React.PointerEvent<T>) => {
      event.preventDefault();
      if (stopPropagation) {
        event.stopPropagation();
      }
      onPress();
    },
    [onPress, stopPropagation],
  );

  const onClick = useCallback(
    (event: React.MouseEvent<T>) => {
      event.preventDefault();
      if (stopPropagation) {
        event.stopPropagation();
      }
    },
    [stopPropagation],
  );

  return {
    onPointerDown,
    onClick,
  };
};
