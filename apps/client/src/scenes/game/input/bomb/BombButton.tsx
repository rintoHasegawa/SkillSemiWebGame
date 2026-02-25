/**
 * BombButton
 * 爆弾設置ボタンの見た目とクリック入力を担う
 * 画面右下固定の操作ボタンを提供する
 */

/** 爆弾設置ボタンの入力プロパティ */
type BombButtonProps = {
  onPress: () => void;
};

const BOMB_BUTTON_STYLE: React.CSSProperties = {
  position: "fixed",
  right: "36px",
  bottom: "40px",
  width: "96px",
  height: "96px",
  borderRadius: "50%",
  border: "2px solid rgba(255,255,255,0.75)",
  background: "rgba(220, 60, 60, 0.85)",
  color: "white",
  fontSize: "18px",
  fontWeight: "bold",
  zIndex: 9999,
  pointerEvents: "auto",
  touchAction: "manipulation",
};

/** 画面右下の爆弾設置ボタンを描画する */
export const BombButton = ({ onPress }: BombButtonProps) => {
  return (
    <button style={BOMB_BUTTON_STYLE} onClick={onPress} type="button">
      BOMB
    </button>
  );
};
