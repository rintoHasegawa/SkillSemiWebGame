/**
 * GameInputOverlay
 * ゲーム入力UIレイヤーを構成する
 * ジョイスティック層と爆弾ボタン層を分離して配置する
 */
import { JoystickInputPresenter } from "./joystick/JoystickInputPresenter";
import { BombButton } from "./bomb/BombButton";

/** 入力UIレイヤーの入力プロパティ */
type GameInputOverlayProps = {
  onJoystickInput: (x: number, y: number) => void;
  onPlaceBomb: () => void;
};

const UI_LAYER_STYLE: React.CSSProperties = {
  position: "absolute",
  zIndex: 20,
  width: "100%",
  height: "100%",
};

/** 入力UIレイヤーを描画する */
export const GameInputOverlay = ({ onJoystickInput, onPlaceBomb }: GameInputOverlayProps) => {
  return (
    <div style={UI_LAYER_STYLE}>
      <JoystickInputPresenter onInput={onJoystickInput} />
      <BombButton onPress={onPlaceBomb} />
    </div>
  );
};
