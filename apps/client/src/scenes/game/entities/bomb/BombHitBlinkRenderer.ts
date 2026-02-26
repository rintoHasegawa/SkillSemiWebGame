/**
 * BombHitBlinkRenderer
 * 爆弾被弾時の点滅演出を描画オブジェクトへ適用する
 * 点滅開始，停止，破棄を一元管理する
 */
import type { Container } from "pixi.js";

type BombHitBlinkRendererOptions = {
  target: Container;
  blinkIntervalMs?: number;
  hiddenAlpha?: number;
};

/** 爆弾被弾時の点滅演出を制御するレンダラー */
export class BombHitBlinkRenderer {
  private readonly target: Container;
  private readonly blinkIntervalMs: number;
  private readonly hiddenAlpha: number;
  private blinkIntervalId: ReturnType<typeof setInterval> | null = null;
  private stopTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isVisibleFrame = true;

  constructor({ target, blinkIntervalMs = 100, hiddenAlpha = 0.2 }: BombHitBlinkRendererOptions) {
    this.target = target;
    this.blinkIntervalMs = blinkIntervalMs;
    this.hiddenAlpha = hiddenAlpha;
  }

  /** 指定時間だけ点滅演出を再生する */
  public play(durationMs: number): void {
    this.stop();
    this.isVisibleFrame = true;
    this.target.alpha = 1;

    this.blinkIntervalId = setInterval(() => {
      this.isVisibleFrame = !this.isVisibleFrame;
      this.target.alpha = this.isVisibleFrame ? 1 : this.hiddenAlpha;
    }, this.blinkIntervalMs);

    this.stopTimeoutId = setTimeout(() => {
      this.stop();
    }, durationMs);
  }

  /** 点滅演出を停止し描画状態を初期化する */
  public stop(): void {
    if (this.blinkIntervalId) {
      clearInterval(this.blinkIntervalId);
      this.blinkIntervalId = null;
    }

    if (this.stopTimeoutId) {
      clearTimeout(this.stopTimeoutId);
      this.stopTimeoutId = null;
    }

    this.isVisibleFrame = true;
    this.target.alpha = 1;
  }

  /** 管理中タイマーを破棄し演出を停止する */
  public destroy(): void {
    this.stop();
  }
}