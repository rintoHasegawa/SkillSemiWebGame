/**
 * GameInputOverlay
 * ゲーム入力UIレイヤーを構成する
 * ジョイスティック層と爆弾ボタン層を分離して配置する
 */
import { config } from "@client/config";
import { JoystickInputPresenter } from "./joystick/presentation/JoystickInputPresenter";
import { BombButton } from "./bomb/presentation/BombButton";
import { useBombCooldownClock } from "./bomb/hooks/useBombCooldownClock";

/** 入力UIレイヤーの入力プロパティ */
type GameInputOverlayProps = {
  isInputEnabled: boolean;
  onJoystickInput: (x: number, y: number) => void;
  onPlaceBomb: () => boolean;
};

const UI_LAYER_STYLE: React.CSSProperties = {
  position: "absolute",
  zIndex: 20,
  width: "100%",
  height: "100%",
};

/** 入力UIレイヤーを描画する */
export const GameInputOverlay = ({
  isInputEnabled,
  onJoystickInput,
  onPlaceBomb,
}: GameInputOverlayProps) => {
  const bombCooldownMs = config.GAME_CONFIG.BOMB_COOLDOWN_MS;
  const { cooldownState, markTriggered } = useBombCooldownClock(bombCooldownMs);

  const handlePressBomb = () => {
    if (!isInputEnabled || !cooldownState.isReady) {
      return;
    }

    const placed = onPlaceBomb();
    if (!placed) {
      return;
    }

    markTriggered();
  };

  return (
    <div style={UI_LAYER_STYLE}>
      <JoystickInputPresenter
        onInput={onJoystickInput}
        isEnabled={isInputEnabled}
      />
      <BombButton
        onPress={handlePressBomb}
        cooldownProgress={cooldownState.progress}
        isReady={isInputEnabled && cooldownState.isReady}
        remainingSecText={cooldownState.remainingSecText}
      />
    </div>
  );
};
