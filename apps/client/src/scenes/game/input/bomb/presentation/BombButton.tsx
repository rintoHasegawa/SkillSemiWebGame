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

/** 爆弾設置ボタンの入力プロパティ */
export type BombButtonProps = {
  onPress: () => void;
  cooldownProgress: number;
  isReady: boolean;
  remainingSecText: string | null;
};

/** 画面右下の爆弾設置ボタンを描画する */
export const BombButton = ({
  onPress,
  cooldownProgress,
  isReady,
  remainingSecText,
}: BombButtonProps) => {
  const frameStyle = buildBombButtonFrameStyle(cooldownProgress);
  const buttonStyle = buildBombButtonStyle(isReady);
  const hitAreaStyle = buildBombButtonHitAreaStyle(isReady);

  const handleActivate = () => {
    if (!isReady) {
      return;
    }

    onPress();
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleActivate();
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleActivate();
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleActivate();
  };

  return (
    <div
      style={hitAreaStyle}
      onPointerDown={handlePointerDown}
      onTouchStart={handleTouchStart}
      onMouseDown={handleMouseDown}
    >
      <div style={frameStyle}>
        <button
          style={buttonStyle}
          onPointerDown={(event) => {
            event.stopPropagation();
            handleActivate();
          }}
          onClick={(event) => {
            event.stopPropagation();
            handleActivate();
          }}
          type="button"
          disabled={!isReady}
        >
          {isReady ? "BOMB" : `${remainingSecText}s`}
        </button>
      </div>
    </div>
  );
};
