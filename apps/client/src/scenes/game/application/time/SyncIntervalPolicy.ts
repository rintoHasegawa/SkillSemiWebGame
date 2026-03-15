/**
 * SyncIntervalPolicy
 * RTTに応じて時刻同期間隔を決定する
 * 通信品質に追従する送信間隔ポリシーを提供する
 */

/** 同期間隔判定の設定値 */
export type SyncIntervalPolicyConfig = {
  defaultIntervalMs: number;
  lowLatencyThresholdMs: number;
  mediumLatencyThresholdMs: number;
  lowLatencyIntervalMs: number;
  mediumLatencyIntervalMs: number;
  highLatencyIntervalMs: number;
};

/** 同期間隔判定の既定設定 */
export const DEFAULT_SYNC_INTERVAL_POLICY_CONFIG: SyncIntervalPolicyConfig = {
  defaultIntervalMs: 3000,
  lowLatencyThresholdMs: 80,
  mediumLatencyThresholdMs: 180,
  lowLatencyIntervalMs: 5000,
  mediumLatencyIntervalMs: 3000,
  highLatencyIntervalMs: 2000,
};

/** RTTに応じた同期間隔を判定する */
export class SyncIntervalPolicy {
  private readonly config: SyncIntervalPolicyConfig;

  constructor(config: Partial<SyncIntervalPolicyConfig> = {}) {
    this.config = {
      ...DEFAULT_SYNC_INTERVAL_POLICY_CONFIG,
      ...config,
    };
  }

  /** RTTに応じた推奨同期間隔を返す */
  public getIntervalMs(smoothedRttMs: number | null): number {
    if (smoothedRttMs === null) {
      return this.config.defaultIntervalMs;
    }

    if (smoothedRttMs <= this.config.lowLatencyThresholdMs) {
      return this.config.lowLatencyIntervalMs;
    }

    if (smoothedRttMs <= this.config.mediumLatencyThresholdMs) {
      return this.config.mediumLatencyIntervalMs;
    }

    return this.config.highLatencyIntervalMs;
  }
}
