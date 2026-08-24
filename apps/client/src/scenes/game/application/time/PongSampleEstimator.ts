/**
 * PongSampleEstimator
 * PONGペイロードからRTTとゲーム時計との差分を推定する
 * サーバー滞留時間を除いたRTTを求め，不正値や過大RTTサンプルを除外する
 */
import type { PongPayload } from "@repo/shared";

/** PONGサンプル推定結果の型 */
export type PongSample = {
  rttMs: number;
  /** クライアント単調時計からサーバーのゲーム経過msへ変換する差分 */
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

  /** PONG受信情報からRTTとゲーム経過msへのoffsetを推定して返す */
  public estimate(
    payload: PongPayload,
    receivedAtMs: number,
  ): PongSample | null {
    // サーバー内での滞留時間を除いた往復のみをRTTとして扱う
    const serverProcessingMs =
      payload.serverSentElapsedMs - payload.serverReceivedElapsedMs;
    const measuredRttMs =
      receivedAtMs - payload.clientTime - serverProcessingMs;
    if (measuredRttMs < 0 || measuredRttMs > this.config.maxAcceptedRttMs) {
      return null;
    }

    // PONG送信時点のゲーム経過msを，受信時刻から片道遅延ぶん巻き戻した瞬間に対応付ける
    const estimatedOneWayMs = measuredRttMs / 2;
    const measuredOffsetMs =
      payload.serverSentElapsedMs - (receivedAtMs - estimatedOneWayMs);

    return {
      rttMs: measuredRttMs,
      offsetMs: measuredOffsetMs,
    };
  }
}
