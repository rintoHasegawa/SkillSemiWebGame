/**
 * resolveBombButtonLabel
 * 爆弾ボタンに表示するラベル文字列を決定する
 * 活性状態と残り秒表示の有無から表示テキストを導出する
 */

/** 爆弾ボタンのラベル決定に必要な入力 */
export type BombButtonLabelParams = {
  isReady: boolean;
  remainingSecText: string | null;
};

/** 活性時に表示する既定ラベル */
export const BOMB_BUTTON_READY_LABEL = "BOMB";

/** 爆弾ボタンの表示テキストを決定する */
export const resolveBombButtonLabel = ({
  isReady,
  remainingSecText,
}: BombButtonLabelParams): string => {
  // 入力ロック中はクールダウンが動いていなくても非活性になるため，
  // 残り秒が無い場合は既定ラベルへフォールバックする
  if (isReady || remainingSecText === null) {
    return BOMB_BUTTON_READY_LABEL;
  }

  return `${remainingSecText}s`;
};
