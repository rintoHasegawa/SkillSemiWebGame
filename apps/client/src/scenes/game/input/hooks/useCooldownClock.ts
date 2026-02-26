/**
 * useCooldownClock
 * クールダウン経過率と残り秒表示を計算するフック
 * トリガー時刻を保持し一定間隔で再計算する
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SYSTEM_TIME_PROVIDER,
  type TimeProvider,
} from "@client/scenes/game/application/time/TimeProvider";

const COOLDOWN_TICK_MS = 50;

/** クールダウンUI描画に必要な状態 */
export type CooldownState = {
  progress: number;
  isReady: boolean;
  remainingSecText: string | null;
};

const READY_STATE: CooldownState = {
  progress: 1,
  isReady: true,
  remainingSecText: null,
};

/** useCooldownClock の依存注入オプション */
export type UseCooldownClockOptions = {
  timeProvider?: TimeProvider;
};

/** クールダウン状態とトリガー操作を提供するフック */
export const useCooldownClock = (
  cooldownMs: number,
  options?: UseCooldownClockOptions,
) => {
  const timeProvider = options?.timeProvider ?? SYSTEM_TIME_PROVIDER;
  const getNow = useCallback(() => timeProvider.now(), [timeProvider]);
  const [lastTriggeredAt, setLastTriggeredAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => getNow());

  useEffect(() => {
    if (lastTriggeredAt === null || cooldownMs <= 0) {
      return;
    }

    const timerId = window.setInterval(() => {
      setNowMs(getNow());
    }, COOLDOWN_TICK_MS);

    return () => {
      window.clearInterval(timerId);
    };
  }, [cooldownMs, getNow, lastTriggeredAt]);

  const cooldownState = useMemo<CooldownState>(() => {
    if (cooldownMs <= 0 || lastTriggeredAt === null) {
      return READY_STATE;
    }

    const elapsed = nowMs - lastTriggeredAt;
    const clampedElapsed = Math.max(0, Math.min(elapsed, cooldownMs));
    const progress = clampedElapsed / cooldownMs;
    const remainingMs = Math.max(0, cooldownMs - clampedElapsed);
    const isReady = remainingMs === 0;

    return {
      progress,
      isReady,
      remainingSecText: isReady ? null : String(Math.ceil(remainingMs / 1000)),
    };
  }, [cooldownMs, lastTriggeredAt, nowMs]);

  const markTriggered = useCallback(() => {
    const now = getNow();
    setLastTriggeredAt(now);
    setNowMs(now);
  }, [getNow]);

  return {
    cooldownState,
    markTriggered,
  };
};