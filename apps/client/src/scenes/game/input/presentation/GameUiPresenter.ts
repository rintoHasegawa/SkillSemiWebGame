/**
 * GameUiPresenter
 * ゲーム画面の表示用データ変換を提供する
 * 残り時間と開始カウントダウンの表示生成を扱う
 */
import { config } from "@client/config";

/** 残り秒数を mm:ss 形式へ変換する */
export const formatRemainingTime = (remainingSec: number): string => {
  const mins = Math.floor(remainingSec / 60);
  const secs = Math.floor(remainingSec % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/** 開始カウントダウン表示文字列を生成する */
export const buildStartCountdownText = (
  remainingSec: number,
): string | null => {
  return remainingSec > 0 ? String(remainingSec) : null;
};

/** ゲーム画面の初期残り時間表示を返す */
export const getInitialTimeDisplay = (): string => {
  return formatRemainingTime(config.GAME_CONFIG.GAME_DURATION_SEC);
};

/** 被弾回数からハートゲージ表示を生成する */
export const buildRespawnHeartGauge = (localBombHitCount: number): string => {
  const maxHearts = Math.max(
    1,
    Math.floor(config.GAME_CONFIG.PLAYER_RESPAWN_HIT_COUNT),
  );
  const clampedHitCount = Math.min(Math.max(localBombHitCount, 0), maxHearts);
  const remainingHearts = maxHearts - clampedHitCount;

  return `${"❤️".repeat(remainingHearts)}${"🤍".repeat(clampedHitCount)}`;
};
