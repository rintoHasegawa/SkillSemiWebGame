/**
 * PongSampleEstimator.test
 * 4タイムスタンプPONGからRTTとゲーム経過msへのoffsetを推定する仕様を検証する
 * サーバー滞留時間の除外・RTT許容範囲の境界・offset算出式を検証する
 */
import { describe, expect, it } from "vitest";

import type { PongPayload } from "@repo/shared";

import {
  DEFAULT_PONG_SAMPLE_ESTIMATOR_CONFIG,
  PongSampleEstimator,
} from "./PongSampleEstimator";

/** テスト用のPONGペイロードを生成する */
const createPongPayload = (
  overrides: Partial<PongPayload> = {},
): PongPayload => {
  return {
    clientTime: 1000,
    serverReceivedElapsedMs: 5000,
    serverSentElapsedMs: 5000,
    ...overrides,
  };
};

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

    const sample = estimator.estimate(createPongPayload(), 1100);

    expect(sample).toEqual({ rttMs: 100, offsetMs: 3950 });
  });

  it("サーバー滞留時間をRTTから除外すること", () => {
    const estimator = new PongSampleEstimator();

    // 受信から送信までサーバー内で20ms滞留した往復240msのPONG
    const sample = estimator.estimate(
      createPongPayload({
        serverReceivedElapsedMs: 5000,
        serverSentElapsedMs: 5020,
      }),
      1240,
    );

    expect(sample?.rttMs).toBe(220);
  });

  it("サーバー滞留時間を除いた片道遅延でoffsetを求めること", () => {
    const estimator = new PongSampleEstimator();

    // RTT220msの半分110msだけ受信時刻を巻き戻した瞬間が送信時点に対応する
    const sample = estimator.estimate(
      createPongPayload({
        serverReceivedElapsedMs: 5000,
        serverSentElapsedMs: 5020,
      }),
      1240,
    );

    expect(sample?.offsetMs).toBe(5020 - (1240 - 110));
  });

  it("滞留時間が異なっても往復が同じならRTTが一致すること", () => {
    const estimator = new PongSampleEstimator();

    const noStallSample = estimator.estimate(
      createPongPayload({
        serverReceivedElapsedMs: 5000,
        serverSentElapsedMs: 5000,
      }),
      1200,
    );
    const stalledSample = estimator.estimate(
      createPongPayload({
        serverReceivedElapsedMs: 5000,
        serverSentElapsedMs: 5150,
      }),
      1350,
    );

    expect(stalledSample?.rttMs).toBe(noStallSample?.rttMs);
  });

  it("カウントダウン中の負の経過msでもサンプルを返すこと", () => {
    const estimator = new PongSampleEstimator();

    const sample = estimator.estimate(
      createPongPayload({
        serverReceivedElapsedMs: -3000,
        serverSentElapsedMs: -3000,
      }),
      1100,
    );

    expect(sample).toEqual({ rttMs: 100, offsetMs: -4050 });
  });

  it("RTTが0の場合もサンプルを返すこと", () => {
    const estimator = new PongSampleEstimator();

    const sample = estimator.estimate(
      createPongPayload({
        clientTime: 1000,
        serverReceivedElapsedMs: 1000,
        serverSentElapsedMs: 1000,
      }),
      1000,
    );

    expect(sample).toEqual({ rttMs: 0, offsetMs: 0 });
  });

  it("RTTが許容上限ちょうどの場合はサンプルを返すこと", () => {
    const estimator = new PongSampleEstimator();

    const sample = estimator.estimate(
      createPongPayload({
        clientTime: 0,
        serverReceivedElapsedMs: 0,
        serverSentElapsedMs: 0,
      }),
      1000,
    );

    expect(sample).toEqual({ rttMs: 1000, offsetMs: -500 });
  });

  it("RTTが許容上限を超える場合はnullを返すこと", () => {
    const estimator = new PongSampleEstimator();

    const sample = estimator.estimate(
      createPongPayload({
        clientTime: 0,
        serverReceivedElapsedMs: 0,
        serverSentElapsedMs: 0,
      }),
      1001,
    );

    expect(sample).toBeNull();
  });

  it("RTTが負値になる場合はnullを返すこと", () => {
    const estimator = new PongSampleEstimator();

    const sample = estimator.estimate(
      createPongPayload({ clientTime: 1000 }),
      999,
    );

    expect(sample).toBeNull();
  });

  it("滞留時間が往復時間を超える場合はnullを返すこと", () => {
    const estimator = new PongSampleEstimator();

    // 滞留300msに対し往復は200msしか経っておらず整合しない
    const sample = estimator.estimate(
      createPongPayload({
        serverReceivedElapsedMs: 5000,
        serverSentElapsedMs: 5300,
      }),
      1200,
    );

    expect(sample).toBeNull();
  });

  it("サーバーのゲーム経過がクライアント単調時計より小さい場合は負のoffsetを返すこと", () => {
    const estimator = new PongSampleEstimator();

    const sample = estimator.estimate(
      createPongPayload({
        clientTime: 1000,
        serverReceivedElapsedMs: 800,
        serverSentElapsedMs: 800,
      }),
      1200,
    );

    expect(sample).toEqual({ rttMs: 200, offsetMs: -300 });
  });

  it("許容RTTを上書きした場合は上書き後の上限で判定すること", () => {
    const estimator = new PongSampleEstimator({ maxAcceptedRttMs: 50 });

    const sample = estimator.estimate(
      createPongPayload({
        clientTime: 0,
        serverReceivedElapsedMs: 0,
        serverSentElapsedMs: 0,
      }),
      51,
    );

    expect(sample).toBeNull();
  });
});
