/**
 * OffsetSmoother
 * 時計差分とRTTの平滑化を管理する
 * 外れ値除外とEWMA更新を集中管理する
 */
import type { PongSample } from "@client/scenes/game/application/time/PongSampleEstimator";

/** 平滑化処理の設定値 */
export type OffsetSmootherConfig = {
  offsetAlpha: number;
  rttAlpha: number;
  maxAcceptedOffsetJumpMs: number;
};

/** 平滑化処理の既定設定 */
export const DEFAULT_OFFSET_SMOOTHER_CONFIG: OffsetSmootherConfig = {
  offsetAlpha: 0.12,
  rttAlpha: 0.25,
  maxAcceptedOffsetJumpMs: 250,
};

/** 時計差分とRTTの平滑化状態を保持する */
export class OffsetSmoother {
  private readonly config: OffsetSmootherConfig;
  private smoothedOffsetMs: number | null = null;
  private smoothedRttMs: number | null = null;

  constructor(config: Partial<OffsetSmootherConfig> = {}) {
    this.config = {
      ...DEFAULT_OFFSET_SMOOTHER_CONFIG,
      ...config,
    };
  }

  /** serverNowからoffset初期値を設定する */
  public seed(serverNowMs: number, receivedAtMs: number): void {
    this.smoothedOffsetMs = serverNowMs - receivedAtMs;
  }

  /** 推定サンプルを取り込み平滑化状態を更新する */
  public applySample(sample: PongSample): void {
    this.smoothedRttMs = this.smoothValue(
      this.smoothedRttMs,
      sample.rttMs,
      this.config.rttAlpha,
    );

    if (
      this.smoothedOffsetMs !== null &&
      Math.abs(sample.offsetMs - this.smoothedOffsetMs) >
        this.config.maxAcceptedOffsetJumpMs
    ) {
      return;
    }

    this.smoothedOffsetMs = this.smoothValue(
      this.smoothedOffsetMs,
      sample.offsetMs,
      this.config.offsetAlpha,
    );
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
