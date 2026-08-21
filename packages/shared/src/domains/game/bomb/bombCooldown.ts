/**
 * bombCooldown
 * 経過時間から爆弾クールダウン時間を導出する純関数を提供する
 * 人間プレイヤーとBotで同一のフィーバー判定式を共有し挙動差を防ぐ
 */
import { GAME_CONFIG } from "../../../config/gameConfig";

// ゲーム開始からの経過時間を残り時間（秒）へ変換する
const toRemainingSec = (elapsedMs: number): number => {
  return Math.max(0, GAME_CONFIG.GAME_DURATION_SEC - elapsedMs / 1000);
};

// 残り時間がしきい値以下ならフィーバータイムとみなす
// 非数の経過時間は比較が成立しないため通常時として扱う
const isFeverTime = (elapsedMs: number): boolean => {
  return (
    toRemainingSec(elapsedMs) <= GAME_CONFIG.BOMB_FEVER_START_REMAINING_SEC
  );
};

/** ゲーム経過時間に応じた爆弾クールダウン時間（ms）を解決する */
export const resolveBombCooldownMs = (elapsedMs: number): number => {
  if (isFeverTime(elapsedMs)) {
    return GAME_CONFIG.BOMB_FEVER_COOLDOWN_MS;
  }

  return GAME_CONFIG.BOMB_NORMAL_COOLDOWN_MS;
};
