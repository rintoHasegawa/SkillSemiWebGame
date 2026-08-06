/**
 * OffsetSmoother.test
 * 時計差分とRTT平滑化の現行挙動を固定する characterization test
 * 初回取り込み・EWMA更新・外れ値除外の境界を検証する
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_OFFSET_SMOOTHER_CONFIG,
  OffsetSmoother,
} from "./OffsetSmoother";

describe("DEFAULT_OFFSET_SMOOTHER_CONFIG", () => {
  it("既定設定が現行値であること", () => {
    expect(DEFAULT_OFFSET_SMOOTHER_CONFIG).toEqual({
      offsetAlpha: 0.12,
      rttAlpha: 0.25,
      maxAcceptedOffsetJumpMs: 250,
    });
  });
});

describe("OffsetSmoother", () => {
  it("初期状態のoffsetは0を返すこと", () => {
    const smoother = new OffsetSmoother();

    expect(smoother.getClockOffsetMs()).toBe(0);
  });

  it("初期状態のRTTはnullを返すこと", () => {
    const smoother = new OffsetSmoother();

    expect(smoother.getSmoothedRttMs()).toBeNull();
  });

  it("seedでserverNowと受信時刻の差をoffsetに設定すること", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);

    expect(smoother.getClockOffsetMs()).toBe(4000);
  });

  it("seedは呼び出しごとに差分を上書きすること", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);
    smoother.seed(3000, 1000);

    expect(smoother.getClockOffsetMs()).toBe(2000);
  });

  it("最初のサンプル取り込みでRTTを実測値そのものにすること", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 100, offsetMs: 0 });

    expect(smoother.getSmoothedRttMs()).toBe(100);
  });

  it("2回目以降のRTTをEWMAで更新すること", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 100, offsetMs: 0 });
    smoother.applySample({ rttMs: 200, offsetMs: 0 });

    expect(smoother.getSmoothedRttMs()).toBe(125);
  });

  it("offset未設定時の最初のサンプルはoffsetを実測値そのものにすること", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 10, offsetMs: 4000 });

    expect(smoother.getClockOffsetMs()).toBe(4000);
  });

  it("seed済みのoffsetをEWMAで更新すること", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);
    smoother.applySample({ rttMs: 10, offsetMs: 4100 });

    expect(smoother.getClockOffsetMs()).toBeCloseTo(4012, 10);
  });

  it("offset差が許容跳躍ちょうどの場合は取り込むこと", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);
    smoother.applySample({ rttMs: 10, offsetMs: 4250 });

    expect(smoother.getClockOffsetMs()).toBeCloseTo(4030, 10);
  });

  it("offset差が許容跳躍を超える場合はoffsetを更新しないこと", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);
    smoother.applySample({ rttMs: 10, offsetMs: 4251 });

    expect(smoother.getClockOffsetMs()).toBe(4000);
  });

  it("offsetを棄却した場合でもRTTは更新すること", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);
    smoother.applySample({ rttMs: 42, offsetMs: 99999 });

    expect(smoother.getSmoothedRttMs()).toBe(42);
  });

  it("負方向の跳躍も許容跳躍を超える場合は棄却すること", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);
    smoother.applySample({ rttMs: 10, offsetMs: 3749 });

    expect(smoother.getClockOffsetMs()).toBe(4000);
  });

  it("resetでoffsetを未設定に戻すこと", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);
    smoother.reset();

    expect(smoother.getClockOffsetMs()).toBe(0);
  });

  it("resetでRTTを未計測に戻すこと", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 100, offsetMs: 0 });
    smoother.reset();

    expect(smoother.getSmoothedRttMs()).toBeNull();
  });

  it("reset後の最初のサンプルは実測値をそのまま採用すること", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);
    smoother.reset();
    smoother.applySample({ rttMs: 10, offsetMs: 99999 });

    expect(smoother.getClockOffsetMs()).toBe(99999);
  });

  it("設定を部分指定した場合は指定値のみ上書きすること", () => {
    const smoother = new OffsetSmoother({ offsetAlpha: 0.5 });

    smoother.seed(1000, 0);
    smoother.applySample({ rttMs: 10, offsetMs: 1200 });

    expect(smoother.getClockOffsetMs()).toBe(1100);
  });
});
