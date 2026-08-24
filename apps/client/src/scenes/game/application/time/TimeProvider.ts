/**
 * TimeProvider
 * 時刻取得の依存を抽象化する
 * テスト時に任意時刻を注入できるようにする
 */

/** 現在時刻ミリ秒を返す時刻取得インターフェース */
export type TimeProvider = {
  now: () => number;
};

/**
 * 実行環境の単調時計を返す既定の時刻取得実装
 * 端末の壁時計がステップしてもゲーム時間が壊れないよう performance.now を使う
 */
export const SYSTEM_TIME_PROVIDER: TimeProvider = {
  now: () => performance.now(),
};
