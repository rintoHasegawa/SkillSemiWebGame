/**
 * BombHitBlinkRenderer
 * 爆弾被弾時の点滅演出を描画オブジェクトへ適用する
 * 点滅開始，停止，破棄を一元管理する
 */
import { Ticker, type Container } from "pixi.js";

type BombHitBlinkRendererOptions = {
  target: Container;
  ticker?: Ticker;
  blinkIntervalMs?: number;
  hiddenAlpha?: number;
  maxDeltaMs?: number;
};

/** 爆弾被弾時の点滅演出を制御するレンダラー */
export class BombHitBlinkRenderer {
  private readonly target: Container;
  private readonly ticker: Ticker;
  private readonly blinkIntervalMs: number;
  private readonly hiddenAlpha: number;
  private readonly maxDeltaMs: number;
  private isVisibleFrame = true;
  private isPlaying = false;
  private remainingDurationMs = 0;
  private elapsedSinceToggleMs = 0;

  constructor({
    target,
    ticker = Ticker.shared,
    blinkIntervalMs = 100,
    hiddenAlpha = 0.2,
    maxDeltaMs = 50,
  }: BombHitBlinkRendererOptions) {
    this.target = target;
    this.ticker = ticker;
    this.blinkIntervalMs = blinkIntervalMs;
    this.hiddenAlpha = hiddenAlpha;
    this.maxDeltaMs = maxDeltaMs;
  }

  /** 指定時間だけ点滅演出を再生する */
  public play(durationMs: number): void {
    this.stop();
    if (durationMs <= 0) {
      return;
    }

    this.isPlaying = true;
    this.remainingDurationMs = durationMs;
    this.elapsedSinceToggleMs = 0;
    this.isVisibleFrame = true;
    this.target.alpha = 1;
    this.ticker.add(this.handleTick);
  }

  /** 点滅演出を停止し描画状態を初期化する */
  public stop(): void {
    if (this.isPlaying) {
      this.ticker.remove(this.handleTick);
    }

    this.isPlaying = false;
    this.remainingDurationMs = 0;
    this.elapsedSinceToggleMs = 0;
    this.isVisibleFrame = true;
    this.target.alpha = 1;
  }

  /** 管理中タイマーを破棄し演出を停止する */
  public destroy(): void {
    this.stop();
  }

  private handleTick = (ticker: Ticker): void => {
    if (!this.isPlaying) {
      return;
    }

    const deltaMs = Math.min(ticker.deltaMS, this.maxDeltaMs);
    this.remainingDurationMs -= deltaMs;
    this.elapsedSinceToggleMs += deltaMs;

    while (this.elapsedSinceToggleMs >= this.blinkIntervalMs) {
      this.elapsedSinceToggleMs -= this.blinkIntervalMs;
      this.isVisibleFrame = !this.isVisibleFrame;
      this.target.alpha = this.isVisibleFrame ? 1 : this.hiddenAlpha;
    }

    if (this.remainingDurationMs <= 0) {
      this.stop();
    }
  };
}