/**
 * ClockSyncService
 * サーバー時刻との差分を平滑化して管理する
 * PING/PONGのRTTを使い，外れ値を除外して同期精度を安定化する
 */
import type { PongPayload } from "@repo/shared";
import { config } from "@client/config";
import {
  SYSTEM_TIME_PROVIDER,
  type TimeProvider,
} from "@client/scenes/game/application/time/TimeProvider";
import {
  PongSampleEstimator,
  type PongSampleEstimatorConfig,
} from "@client/scenes/game/application/time/PongSampleEstimator";
import {
  OffsetSmoother,
  type OffsetSmootherConfig,
} from "@client/scenes/game/application/time/OffsetSmoother";
import {
  SyncIntervalPolicy,
  type SyncIntervalPolicyConfig,
} from "@client/scenes/game/application/time/SyncIntervalPolicy";

/** 時刻同期に利用する更新パラメータ */
export type ClockSyncConfig = {
  estimator: PongSampleEstimatorConfig;
  smoother: OffsetSmootherConfig;
  intervalPolicy: SyncIntervalPolicyConfig;
};

/** 時刻同期の既定パラメータ */
export const DEFAULT_CLOCK_SYNC_CONFIG: ClockSyncConfig = {
  estimator: {
    maxAcceptedRttMs:
      config.GAME_CONFIG.CLOCK_SYNC.ESTIMATOR.MAX_ACCEPTED_RTT_MS,
  },
  smoother: {
    offsetAlpha: config.GAME_CONFIG.CLOCK_SYNC.SMOOTHER.OFFSET_ALPHA,
    rttAlpha: config.GAME_CONFIG.CLOCK_SYNC.SMOOTHER.RTT_ALPHA,
    maxAcceptedOffsetJumpMs:
      config.GAME_CONFIG.CLOCK_SYNC.SMOOTHER.MAX_ACCEPTED_OFFSET_JUMP_MS,
  },
  intervalPolicy: {
    defaultIntervalMs:
      config.GAME_CONFIG.CLOCK_SYNC.INTERVAL_POLICY.DEFAULT_INTERVAL_MS,
    lowLatencyThresholdMs:
      config.GAME_CONFIG.CLOCK_SYNC.INTERVAL_POLICY.LOW_LATENCY_THRESHOLD_MS,
    mediumLatencyThresholdMs:
      config.GAME_CONFIG.CLOCK_SYNC.INTERVAL_POLICY
        .MEDIUM_LATENCY_THRESHOLD_MS,
    lowLatencyIntervalMs:
      config.GAME_CONFIG.CLOCK_SYNC.INTERVAL_POLICY.LOW_LATENCY_INTERVAL_MS,
    mediumLatencyIntervalMs:
      config.GAME_CONFIG.CLOCK_SYNC.INTERVAL_POLICY
        .MEDIUM_LATENCY_INTERVAL_MS,
    highLatencyIntervalMs:
      config.GAME_CONFIG.CLOCK_SYNC.INTERVAL_POLICY.HIGH_LATENCY_INTERVAL_MS,
  },
};

/** サーバー時刻との差分を平滑化して保持する */
export class ClockSyncService {
  private readonly nowProvider: TimeProvider["now"];
  private readonly estimator: PongSampleEstimator;
  private readonly smoother: OffsetSmoother;
  private readonly intervalPolicy: SyncIntervalPolicy;

  constructor(
    config: Partial<ClockSyncConfig> = {},
    nowProvider: TimeProvider["now"] = SYSTEM_TIME_PROVIDER.now,
  ) {
    const mergedConfig = {
      estimator: {
        ...DEFAULT_CLOCK_SYNC_CONFIG.estimator,
        ...config.estimator,
      },
      smoother: {
        ...DEFAULT_CLOCK_SYNC_CONFIG.smoother,
        ...config.smoother,
      },
      intervalPolicy: {
        ...DEFAULT_CLOCK_SYNC_CONFIG.intervalPolicy,
        ...config.intervalPolicy,
      },
    };
    this.nowProvider = nowProvider;
    this.estimator = new PongSampleEstimator(mergedConfig.estimator);
    this.smoother = new OffsetSmoother(mergedConfig.smoother);
    this.intervalPolicy = new SyncIntervalPolicy(mergedConfig.intervalPolicy);
  }

  /** 受信した serverNow をもとに差分を初期化する */
  public seedFromServerNow(
    serverNowMs: number,
    receivedAtMs = this.nowProvider(),
  ): void {
    this.smoother.seed(serverNowMs, receivedAtMs);
  }

  /** PONGサンプルを取り込み，差分とRTTを更新する */
  public updateFromPong(
    payload: PongPayload,
    receivedAtMs = this.nowProvider(),
  ): void {
    const sample = this.estimator.estimate(payload, receivedAtMs);
    if (!sample) {
      return;
    }

    this.smoother.applySample(sample);
  }

  /** 平滑化済みの時刻差分ミリ秒を返す */
  public getClockOffsetMs(): number {
    return this.smoother.getClockOffsetMs();
  }

  /** サーバー時刻基準へ補正した現在時刻ミリ秒を返す */
  public getSynchronizedNowMs(): number {
    return this.nowProvider() + this.getClockOffsetMs();
  }

  /** RTT状況に応じた次回同期推奨間隔ミリ秒を返す */
  public getRecommendedSyncIntervalMs(): number {
    return this.intervalPolicy.getIntervalMs(this.smoother.getSmoothedRttMs());
  }

  /** 内部状態を初期化する */
  public reset(): void {
    this.smoother.reset();
  }
}
