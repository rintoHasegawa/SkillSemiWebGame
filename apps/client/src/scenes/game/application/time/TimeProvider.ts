/**
 * TimeProvider
 * 時刻取得の依存を抽象化する
 * テスト時に任意時刻を注入できるようにする
 */

/** 現在時刻ミリ秒を返す時刻取得インターフェース */
export type TimeProvider = {
  now: () => number;
};

/** 実行環境の現在時刻を返す既定の時刻取得実装 */
export const SYSTEM_TIME_PROVIDER: TimeProvider = {
  now: () => Date.now(),
};