/**
 * BombButton
 * 爆弾設置ボタンの見た目とクリック入力を担う
 * 画面右下固定の操作ボタンを提供する
 */
import {
  buildBombButtonFrameStyle,
  buildBombButtonHitAreaStyle,
  buildBombButtonStyle,
} from "./BombButton.styles";
import { useImmediatePressHandlers } from "@client/scenes/game/input/presentation/useImmediatePressHandlers";
import { useCallback } from "react";

/** 爆弾設置ボタンの入力プロパティ */
export type BombButtonProps = {
  onPress: () => void;
  cooldownProgress: number;
  isReady: boolean;
  isFeverTime: boolean;
  remainingSecText: string | null;
};

/** 画面右下の爆弾設置ボタンを描画する */
export const BombButton = ({
  onPress,
  cooldownProgress,
  isReady,
  isFeverTime,
  remainingSecText,
}: BombButtonProps) => {
  const frameStyle = buildBombButtonFrameStyle(cooldownProgress);
  const buttonStyle = buildBombButtonStyle(isReady, isFeverTime);
  const hitAreaStyle = buildBombButtonHitAreaStyle(isReady);

  const handleActivate = useCallback(() => {
    if (!isReady) {
      return;
    }

    onPress();
  }, [isReady, onPress]);

  const { onPointerDown: onHitAreaPointerDown, onClick: onHitAreaClick } =
    useImmediatePressHandlers<HTMLDivElement>(handleActivate, {
      stopPropagation: false,
    });
  const { onPointerDown: onButtonPointerDown, onClick: onButtonClick } =
    useImmediatePressHandlers<HTMLButtonElement>(handleActivate);

  return (
    <div
      style={hitAreaStyle}
      onPointerDown={onHitAreaPointerDown}
      onClick={onHitAreaClick}
    >
      <div style={frameStyle}>
        <button
          style={buttonStyle}
          onPointerDown={onButtonPointerDown}
          onClick={onButtonClick}
          type="button"
          disabled={!isReady}
        >
          {isReady ? "BOMB" : `${remainingSecText}s`}
        </button>
      </div>
    </div>
  );
};
