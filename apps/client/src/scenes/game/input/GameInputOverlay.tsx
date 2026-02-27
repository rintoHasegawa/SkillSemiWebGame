/**
 * GameInputOverlay
 * ゲーム入力UIレイヤーを構成する
 * ジョイスティック層と爆弾ボタン層を分離して配置する
 */
import { config } from "@client/config";
import { JoystickInputPresenter } from "./joystick/presentation/JoystickInputPresenter";
import { BombButton } from "./bomb/presentation/BombButton";
import { useBombCooldownClock } from "./bomb/hooks/useBombCooldownClock";
import { buildGameInputOverlayLayerStyle } from "./GameInputOverlay.styles";

/** 入力UIレイヤーの入力プロパティ */
type GameInputOverlayProps = {
  isInputEnabled: boolean;
  isFeverTime: boolean;
  onJoystickInput: (x: number, y: number) => void;
  onPlaceBomb: () => boolean;
};

/** 入力UIレイヤーを描画する */
export const GameInputOverlay = ({
  isInputEnabled,
  isFeverTime,
  onJoystickInput,
  onPlaceBomb,
}: GameInputOverlayProps) => {
  const bombCooldownMs = isFeverTime
    ? config.GAME_CONFIG.BOMB_FEVER_COOLDOWN_MS
    : config.GAME_CONFIG.BOMB_NORMAL_COOLDOWN_MS;
  const { cooldownState, markTriggered } = useBombCooldownClock(bombCooldownMs);
  const layerStyle = buildGameInputOverlayLayerStyle();

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
    <div style={layerStyle}>
      <JoystickInputPresenter
        onInput={onJoystickInput}
        isEnabled={isInputEnabled}
      />
      <BombButton
        onPress={handlePressBomb}
        cooldownProgress={cooldownState.progress}
        isReady={isInputEnabled && cooldownState.isReady}
        isFeverTime={isFeverTime}
        remainingSecText={cooldownState.remainingSecText}
      />
    </div>
  );
};
