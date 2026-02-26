/**
 * useBombCooldownClock
 * 爆弾ボタン専用のクールダウン状態を提供する
 * 汎用クールダウンフックを利用して爆弾入力の責務を明確化する
 */
import {
  useCooldownClock,
  type UseCooldownClockOptions,
} from "@client/scenes/game/input/hooks/useCooldownClock";

/** 爆弾クールダウン状態を取得するフック */
export const useBombCooldownClock = (
  cooldownMs: number,
  options?: UseCooldownClockOptions,
) => {
  return useCooldownClock(cooldownMs, options);
};
