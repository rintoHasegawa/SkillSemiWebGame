/**
 * BombButton
 * 爆弾設置ボタンの見た目とクリック入力を担う
 * 画面右下固定の操作ボタンを提供する
 */

/** 爆弾設置ボタンの入力プロパティ */
type BombButtonProps = {
  onPress: () => void;
  cooldownProgress: number;
  isReady: boolean;
  remainingSecText: string | null;
};

const BOMB_BUTTON_FRAME_STYLE: React.CSSProperties = {
  width: "108px",
  height: "108px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
};

const BOMB_BUTTON_HIT_AREA_STYLE: React.CSSProperties = {
  position: "fixed",
  right: "24px",
  bottom: "28px",
  width: "120px",
  height: "120px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  touchAction: "manipulation",
};

const BOMB_BUTTON_STYLE: React.CSSProperties = {
  width: "96px",
  height: "96px",
  borderRadius: "50%",
  border: "2px solid rgba(255,255,255,0.75)",
  background: "rgba(220, 60, 60, 0.85)",
  color: "white",
  fontSize: "18px",
  fontWeight: "bold",
  pointerEvents: "auto",
  touchAction: "manipulation",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** 画面右下の爆弾設置ボタンを描画する */
export const BombButton = ({
  onPress,
  cooldownProgress,
  isReady,
  remainingSecText,
}: BombButtonProps) => {
  const progressDeg = Math.max(0, Math.min(1, cooldownProgress)) * 360;
  const frameStyle: React.CSSProperties = {
    ...BOMB_BUTTON_FRAME_STYLE,
    background: `conic-gradient(rgba(255,255,255,0.95) ${progressDeg}deg, rgba(255,255,255,0.2) ${progressDeg}deg 360deg)`,
  };

  const buttonStyle: React.CSSProperties = {
    ...BOMB_BUTTON_STYLE,
    background: isReady ? "rgba(220, 60, 60, 0.85)" : "rgba(110, 40, 40, 0.85)",
    opacity: isReady ? 1 : 0.88,
    cursor: isReady ? "pointer" : "not-allowed",
  };

  const hitAreaStyle: React.CSSProperties = {
    ...BOMB_BUTTON_HIT_AREA_STYLE,
    cursor: isReady ? "pointer" : "not-allowed",
  };

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

  return (
    <div style={hitAreaStyle} onPointerDown={handlePointerDown}>
      <div style={frameStyle}>
        <button
          style={buttonStyle}
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
