/**
 * PongSampleEstimator.test
 * PONGサンプル推定の現行挙動を固定する characterization test
 * RTT許容範囲の境界とoffset算出式を検証する
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PONG_SAMPLE_ESTIMATOR_CONFIG,
  PongSampleEstimator,
} from "./PongSampleEstimator";

describe("DEFAULT_PONG_SAMPLE_ESTIMATOR_CONFIG", () => {
  it("既定設定が現行値であること", () => {
    expect(DEFAULT_PONG_SAMPLE_ESTIMATOR_CONFIG).toEqual({
      maxAcceptedRttMs: 1000,
    });
  });
});

describe("PongSampleEstimator", () => {
  it("RTTと片道遅延補正済みのoffsetを返すこと", () => {
    const estimator = new PongSampleEstimator();

    const sample = estimator.estimate(
      { clientTime: 1000, serverTime: 5000 },
      1100,
    );

    expect(sample).toEqual({ rttMs: 100, offsetMs: 3950 });
  });

  it("RTTが0の場合もサンプルを返すこと", () => {
    const estimator = new PongSampleEstimator();

    const sample = estimator.estimate(
      { clientTime: 1000, serverTime: 1000 },
      1000,
    );

    expect(sample).toEqual({ rttMs: 0, offsetMs: 0 });
  });

  it("RTTが許容上限ちょうどの場合はサンプルを返すこと", () => {
    const estimator = new PongSampleEstimator();

    const sample = estimator.estimate(
      { clientTime: 0, serverTime: 0 },
      1000,
    );

    expect(sample).toEqual({ rttMs: 1000, offsetMs: -500 });
  });

  it("RTTが許容上限を超える場合はnullを返すこと", () => {
    const estimator = new PongSampleEstimator();

    const sample = estimator.estimate({ clientTime: 0, serverTime: 0 }, 1001);

    expect(sample).toBeNull();
  });

  it("RTTが負値になる場合はnullを返すこと", () => {
    const estimator = new PongSampleEstimator();

    const sample = estimator.estimate({ clientTime: 1000, serverTime: 0 }, 999);

    expect(sample).toBeNull();
  });

  it("サーバー時刻がクライアントより遅れている場合は負のoffsetを返すこと", () => {
    const estimator = new PongSampleEstimator();

    const sample = estimator.estimate(
      { clientTime: 1000, serverTime: 800 },
      1200,
    );

    expect(sample).toEqual({ rttMs: 200, offsetMs: -300 });
  });

  it("許容RTTを上書きした場合は上書き後の上限で判定すること", () => {
    const estimator = new PongSampleEstimator({ maxAcceptedRttMs: 50 });

    expect(estimator.estimate({ clientTime: 0, serverTime: 0 }, 51)).toBeNull();
  });
});
