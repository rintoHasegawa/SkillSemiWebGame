/**
 * shouldShowFeverBanner
 * フィーバー開始バナーを表示するかどうかを決定する
 * 経過時間基準のフィーバー判定と同じ瞬間に開始1秒間だけ表示させる
 */
import { config } from "@client/config";

/** フィーバー開始バナーの表示判定に必要な入力 */
export type FeverBannerVisibilityParams = {
  isFeverTime: boolean;
  remainingSeconds: number;
};

/** フィーバー開始バナーを表示するかを決定する */
export const shouldShowFeverBanner = ({
  isFeverTime,
  remainingSeconds,
}: FeverBannerVisibilityParams): boolean => {
  // 実ゲートと同じ経過時間基準の判定が立ち上がるまでは表示しない
  if (!isFeverTime) {
    return false;
  }

  // 表示秒は切り捨てのためフィーバー開始直後はしきい値-1秒を指す
  const feverStartSec = config.GAME_CONFIG.BOMB_FEVER_START_REMAINING_SEC;

  return (
    remainingSeconds <= feverStartSec && remainingSeconds >= feverStartSec - 1
  );
};
