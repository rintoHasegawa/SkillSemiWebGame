/**
 * PongSampleEstimator
 * PONGペイロードからRTTと時計差分を推定する
 * 不正値や過大RTTサンプルを除外して品質を担保する
 */
import type { PongPayload } from "@repo/shared";

/** PONGサンプル推定結果の型 */
export type PongSample = {
  rttMs: number;
  offsetMs: number;
};

/** PONGサンプル推定の設定値 */
export type PongSampleEstimatorConfig = {
  maxAcceptedRttMs: number;
};

/** PONGサンプル推定の既定設定 */
export const DEFAULT_PONG_SAMPLE_ESTIMATOR_CONFIG: PongSampleEstimatorConfig = {
  maxAcceptedRttMs: 1000,
};

/** PONGから同期サンプルを推定する */
export class PongSampleEstimator {
  private readonly config: PongSampleEstimatorConfig;

  constructor(config: Partial<PongSampleEstimatorConfig> = {}) {
    this.config = {
      ...DEFAULT_PONG_SAMPLE_ESTIMATOR_CONFIG,
      ...config,
    };
  }

  /** PONG受信情報からRTTとoffsetを推定して返す */
  public estimate(
    payload: PongPayload,
    receivedAtMs: number,
  ): PongSample | null {
    const measuredRttMs = receivedAtMs - payload.clientTime;
    if (measuredRttMs < 0 || measuredRttMs > this.config.maxAcceptedRttMs) {
      return null;
    }

    const estimatedOneWayMs = measuredRttMs / 2;
    const measuredOffsetMs =
      payload.serverTime - (payload.clientTime + estimatedOneWayMs);

    return {
      rttMs: measuredRttMs,
      offsetMs: measuredOffsetMs,
    };
  }
}
