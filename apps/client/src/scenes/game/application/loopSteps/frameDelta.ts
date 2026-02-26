/**
 * frameDelta
 * フレーム更新で利用する時間差分を正規化する
 * clamp を適用して処理系全体の時間進行を安定化する
 */
import type { Ticker } from "pixi.js";

/** フレーム更新で利用する時間差分を表す型 */
export type FrameDelta = {
  deltaMs: number;
  deltaSeconds: number;
};

/** Ticker から clamp 済みのフレーム時間差分を生成する */
export const resolveFrameDelta = (ticker: Ticker, maxDeltaMs: number): FrameDelta => {
  const boundedDeltaMs = Math.min(Math.max(ticker.deltaMS, 0), maxDeltaMs);
  return {
    deltaMs: boundedDeltaMs,
    deltaSeconds: boundedDeltaMs / 1000,
  };
};
