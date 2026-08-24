/**
 * OffsetSmoother
 * 時計差分とRTTの平滑化を管理する
 * 外れ値除外・EWMA更新・暫定値からのベースライン再構築を集中管理する
 */
import type { PongSample } from "./PongSampleEstimator";

/** 平滑化処理の設定値 */
export type OffsetSmootherConfig = {
  offsetAlpha: number;
  rttAlpha: number;
  maxAcceptedOffsetJumpMs: number;
  maxConsecutiveRejectedSamples: number;
};

/** 平滑化処理の既定設定 */
export const DEFAULT_OFFSET_SMOOTHER_CONFIG: OffsetSmootherConfig = {
  offsetAlpha: 0.12,
  rttAlpha: 0.25,
  maxAcceptedOffsetJumpMs: 250,
  maxConsecutiveRejectedSamples: 3,
};

/** 時計差分とRTTの平滑化状態を保持する */
export class OffsetSmoother {
  private readonly config: OffsetSmootherConfig;
  private smoothedOffsetMs: number | null = null;
  private smoothedRttMs: number | null = null;
  // seed由来のoffsetは片道遅延ぶん過小な暫定値なので，実測サンプルで置換するまで印を立てる
  private isOffsetProvisional = false;
  private consecutiveRejectedSampleCount = 0;

  constructor(config: Partial<OffsetSmootherConfig> = {}) {
    this.config = {
      ...DEFAULT_OFFSET_SMOOTHER_CONFIG,
      ...config,
    };
  }

  /** serverNowからoffset初期値を設定する */
  public seed(serverNowMs: number, receivedAtMs: number): void {
    // 実測サンプル取り込み済みの場合は，暫定値で測定結果を汚さない
    if (this.smoothedOffsetMs !== null && !this.isOffsetProvisional) {
      return;
    }

    this.smoothedOffsetMs = serverNowMs - receivedAtMs;
    this.isOffsetProvisional = true;
  }

  /** 推定サンプルを取り込み平滑化状態を更新する */
  public applySample(sample: PongSample): void {
    const shouldRebaseline = this.shouldRebaselineOffset();

    // 外れ値サンプルはRTTにも反映しないよう，棄却判定を先に行う
    if (!shouldRebaseline && this.isOutlierSample(sample)) {
      this.consecutiveRejectedSampleCount += 1;
      return;
    }

    // 採用サンプルでRTTとoffsetを更新し，暫定状態と連続棄却の記録を解除する
    this.smoothedRttMs = this.smoothValue(
      this.smoothedRttMs,
      sample.rttMs,
      this.config.rttAlpha,
    );

    this.smoothedOffsetMs = shouldRebaseline
      ? sample.offsetMs
      : this.smoothValue(
          this.smoothedOffsetMs,
          sample.offsetMs,
          this.config.offsetAlpha,
        );

    this.isOffsetProvisional = false;
    this.consecutiveRejectedSampleCount = 0;
  }

  /** 平滑化済みoffsetを返す */
  public getClockOffsetMs(): number {
    return this.smoothedOffsetMs ?? 0;
  }

  /** 平滑化済みRTTを返す */
  public getSmoothedRttMs(): number | null {
    return this.smoothedRttMs;
  }

  /** 内部平滑化状態を初期化する */
  public reset(): void {
    this.smoothedOffsetMs = null;
    this.smoothedRttMs = null;
    this.isOffsetProvisional = false;
    this.consecutiveRejectedSampleCount = 0;
  }

  // 暫定offsetのままの場合と連続棄却が上限に達した場合は，実測値でベースラインを組み直す
  private shouldRebaselineOffset(): boolean {
    return (
      this.isOffsetProvisional ||
      this.consecutiveRejectedSampleCount >=
        this.config.maxConsecutiveRejectedSamples
    );
  }

  // 平滑化済みoffsetからの跳躍が許容量を超えるサンプルかを判定する
  private isOutlierSample(sample: PongSample): boolean {
    if (this.smoothedOffsetMs === null) {
      return false;
    }

    return (
      Math.abs(sample.offsetMs - this.smoothedOffsetMs) >
      this.config.maxAcceptedOffsetJumpMs
    );
  }

  private smoothValue(
    current: number | null,
    measured: number,
    alpha: number,
  ): number {
    if (current === null) {
      return measured;
    }

    return current * (1 - alpha) + measured * alpha;
  }
}
