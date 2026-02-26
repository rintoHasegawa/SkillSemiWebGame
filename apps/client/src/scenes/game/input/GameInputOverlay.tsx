/**
 * GameInputOverlay
 * ゲーム入力UIレイヤーを構成する
 * ジョイスティック層と爆弾ボタン層を分離して配置する
 */
import { useEffect, useMemo, useState } from "react";
import { config } from "@client/config";
import { JoystickInputPresenter } from "./joystick/JoystickInputPresenter";
import { BombButton } from "./bomb/BombButton";

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

const COOLDOWN_TICK_MS = 50;

/** 入力UIレイヤーを描画する */
export const GameInputOverlay = ({
  isInputEnabled,
  onJoystickInput,
  onPlaceBomb,
}: GameInputOverlayProps) => {
  const bombCooldownMs = config.GAME_CONFIG.BOMB_COOLDOWN_MS;
  const [lastBombPressedAt, setLastBombPressedAt] = useState<number | null>(
    null,
  );
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (lastBombPressedAt === null) {
      return;
    }

    const timerId = window.setInterval(() => {
      setNowMs(Date.now());
    }, COOLDOWN_TICK_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [lastBombPressedAt]);

  const cooldownState = useMemo(() => {
    if (bombCooldownMs <= 0) {
      return {
        progress: 1,
        isReady: true,
        remainingSecText: null,
      };
    }

    if (lastBombPressedAt === null) {
      return {
        progress: 1,
        isReady: true,
        remainingSecText: null,
      };
    }

    const elapsed = nowMs - lastBombPressedAt;
    const clampedElapsed = Math.max(0, Math.min(elapsed, bombCooldownMs));
    const progress = clampedElapsed / bombCooldownMs;
    const remainingMs = Math.max(0, bombCooldownMs - clampedElapsed);
    const isReady = remainingMs === 0;

    return {
      progress,
      isReady,
      remainingSecText: isReady ? null : String(Math.ceil(remainingMs / 1000)),
    };
  }, [bombCooldownMs, lastBombPressedAt, nowMs]);

  const handlePressBomb = () => {
    if (!isInputEnabled || !cooldownState.isReady) {
      return;
    }

    const placed = onPlaceBomb();
    if (!placed) {
      return;
    }

    setLastBombPressedAt(Date.now());
    setNowMs(Date.now());
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
