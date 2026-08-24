/**
 * isBombFeverTime
 * ゲーム経過時間からフィーバータイムかどうかを解決する
 * 爆弾クールダウンの実ゲートと同じ共有判定を用い表示と挙動のズレを防ぐ
 */
import { domain } from "@repo/shared";
import { config } from "@client/config";

/** 経過時間がフィーバータイムに入っているかを返す */
export const isBombFeverTime = (elapsedMs: number): boolean => {
  return (
    domain.game.bomb.resolveBombCooldownMs(elapsedMs)
      === config.GAME_CONFIG.BOMB_FEVER_COOLDOWN_MS
  );
};
