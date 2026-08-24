/**
 * ClockSyncService
 * サーバーのゲーム経過時間との差分を推定して管理する
 * PING/PONGの最小RTTサンプルを採用し，slewで追従して同期精度を安定化する
 */
import type { PongPayload } from "@repo/shared";
import { config } from "@client/config";
import { SYSTEM_TIME_PROVIDER, type TimeProvider } from "./TimeProvider";
import {
  PongSampleEstimator,
  type PongSampleEstimatorConfig,
} from "./PongSampleEstimator";
import {
  ClockOffsetTracker,
  type ClockOffsetTrackerConfig,
} from "./ClockOffsetTracker";
import {
  SyncIntervalPolicy,
  type SyncIntervalPolicyConfig,
} from "./SyncIntervalPolicy";

/** 時刻同期に利用する更新パラメータ */
export type ClockSyncConfig = {
  estimator: PongSampleEstimatorConfig;
  offsetTracker: ClockOffsetTrackerConfig;
  intervalPolicy: SyncIntervalPolicyConfig;
};

/**
 * 時刻同期パラメータの部分指定形
 * 実装が各セクションを既定値と浅くマージするため，ネスト単位で省略できる
 */
export type PartialClockSyncConfig = {
  [K in keyof ClockSyncConfig]?: Partial<ClockSyncConfig[K]>;
};

/** 時刻同期の既定パラメータ */
export const DEFAULT_CLOCK_SYNC_CONFIG: ClockSyncConfig = {
  estimator: {
    maxAcceptedRttMs:
      config.GAME_CONFIG.CLOCK_SYNC.ESTIMATOR.MAX_ACCEPTED_RTT_MS,
  },
  offsetTracker: {
    sampleWindowSize:
      config.GAME_CONFIG.CLOCK_SYNC.OFFSET_TRACKER.SAMPLE_WINDOW_SIZE,
    maxSlewPerSampleMs:
      config.GAME_CONFIG.CLOCK_SYNC.OFFSET_TRACKER.MAX_SLEW_PER_SAMPLE_MS,
    rttAlpha: config.GAME_CONFIG.CLOCK_SYNC.OFFSET_TRACKER.RTT_ALPHA,
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

/** サーバーのゲーム経過時間との差分を推定して保持する */
export class ClockSyncService {
  private readonly nowProvider: TimeProvider["now"];
  private readonly estimator: PongSampleEstimator;
  private readonly offsetTracker: ClockOffsetTracker;
  private readonly intervalPolicy: SyncIntervalPolicy;

  constructor(
    config: PartialClockSyncConfig = {},
    nowProvider: TimeProvider["now"] = SYSTEM_TIME_PROVIDER.now,
  ) {
    const mergedConfig: ClockSyncConfig = {
      estimator: {
        ...DEFAULT_CLOCK_SYNC_CONFIG.estimator,
        ...config.estimator,
      },
      offsetTracker: {
        ...DEFAULT_CLOCK_SYNC_CONFIG.offsetTracker,
        ...config.offsetTracker,
      },
      intervalPolicy: {
        ...DEFAULT_CLOCK_SYNC_CONFIG.intervalPolicy,
        ...config.intervalPolicy,
      },
    };
    this.nowProvider = nowProvider;
    this.estimator = new PongSampleEstimator(mergedConfig.estimator);
    this.offsetTracker = new ClockOffsetTracker(mergedConfig.offsetTracker);
    this.intervalPolicy = new SyncIntervalPolicy(mergedConfig.intervalPolicy);
  }

  /** 受信したサーバーのゲーム経過msをもとに差分を初期化する */
  public seedFromServerElapsed(
    serverElapsedMs: number,
    receivedAtMs = this.nowProvider(),
  ): void {
    this.offsetTracker.seed(serverElapsedMs, receivedAtMs);
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

    this.offsetTracker.applySample(sample);
  }

  /** 推定済みの時刻差分ミリ秒を返す */
  public getClockOffsetMs(): number {
    return this.offsetTracker.getClockOffsetMs();
  }

  /**
   * サーバー基準の符号付きゲーム経過ミリ秒を返す
   * ゲームプレイ開始前は負値を返し，時計未同期時は null を返す
   */
  public getElapsedMs(): number | null {
    // 未同期のまま単調時計を返すと，読み込みからの経過が経過時間として通ってしまう
    if (!this.offsetTracker.hasOffsetEstimate()) {
      return null;
    }

    return this.nowProvider() + this.getClockOffsetMs();
  }

  /** RTT状況に応じた次回同期推奨間隔ミリ秒を返す */
  public getRecommendedSyncIntervalMs(): number {
    return this.intervalPolicy.getIntervalMs(
      this.offsetTracker.getSmoothedRttMs(),
    );
  }

  /** 内部状態を初期化する */
  public reset(): void {
    this.offsetTracker.reset();
  }
}
