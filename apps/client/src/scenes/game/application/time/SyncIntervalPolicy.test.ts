/**
 * SyncIntervalPolicy.test
 * RTT別の同期間隔判定の現行挙動を固定する characterization test
 * 閾値境界と未計測時のフォールバックを検証する
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_SYNC_INTERVAL_POLICY_CONFIG,
  SyncIntervalPolicy,
} from "./SyncIntervalPolicy";

describe("DEFAULT_SYNC_INTERVAL_POLICY_CONFIG", () => {
  it("既定設定が現行値であること", () => {
    expect(DEFAULT_SYNC_INTERVAL_POLICY_CONFIG).toEqual({
      defaultIntervalMs: 3000,
      lowLatencyThresholdMs: 80,
      mediumLatencyThresholdMs: 180,
      lowLatencyIntervalMs: 5000,
      mediumLatencyIntervalMs: 3000,
      highLatencyIntervalMs: 2000,
    });
  });
});

describe("SyncIntervalPolicy", () => {
  it("RTT未計測（null）の場合は既定間隔を返すこと", () => {
    const policy = new SyncIntervalPolicy();

    expect(policy.getIntervalMs(null)).toBe(3000);
  });

  it("RTTが0の場合は低遅延間隔を返すこと", () => {
    const policy = new SyncIntervalPolicy();

    expect(policy.getIntervalMs(0)).toBe(5000);
  });

  it("RTTが低遅延閾値ちょうどの場合は低遅延間隔を返すこと", () => {
    const policy = new SyncIntervalPolicy();

    expect(policy.getIntervalMs(80)).toBe(5000);
  });

  it("RTTが低遅延閾値を超える場合は中遅延間隔を返すこと", () => {
    const policy = new SyncIntervalPolicy();

    expect(policy.getIntervalMs(80.1)).toBe(3000);
  });

  it("RTTが中遅延閾値ちょうどの場合は中遅延間隔を返すこと", () => {
    const policy = new SyncIntervalPolicy();

    expect(policy.getIntervalMs(180)).toBe(3000);
  });

  it("RTTが中遅延閾値を超える場合は高遅延間隔を返すこと", () => {
    const policy = new SyncIntervalPolicy();

    expect(policy.getIntervalMs(180.1)).toBe(2000);
  });

  it("RTTが負値の場合は低遅延間隔を返すこと", () => {
    const policy = new SyncIntervalPolicy();

    expect(policy.getIntervalMs(-1)).toBe(5000);
  });

  it("設定を部分指定した場合は指定値のみ上書きすること", () => {
    const policy = new SyncIntervalPolicy({ lowLatencyIntervalMs: 1234 });

    expect({
      low: policy.getIntervalMs(10),
      medium: policy.getIntervalMs(100),
    }).toEqual({ low: 1234, medium: 3000 });
  });

  it("閾値を上書きした場合は上書き後の境界で判定すること", () => {
    const policy = new SyncIntervalPolicy({ lowLatencyThresholdMs: 10 });

    expect({
      atThreshold: policy.getIntervalMs(10),
      overThreshold: policy.getIntervalMs(11),
    }).toEqual({ atThreshold: 5000, overThreshold: 3000 });
  });
});
