/**
 * ClockOffsetTracker.test
 * 最小RTTサンプルによるoffset推定とslew追従の仕様を検証する
 * 窓の入れ替え・seedのフォールバック・RTT平滑化・設定値検証を検証する
 */
import { describe, expect, it } from "vitest";

import type { PongSample } from "./PongSampleEstimator";
import {
  ClockOffsetTracker,
  DEFAULT_CLOCK_OFFSET_TRACKER_CONFIG,
} from "./ClockOffsetTracker";

/** テスト用のPONGサンプルを生成する */
const createSample = (rttMs: number, offsetMs: number): PongSample => {
  return { rttMs, offsetMs };
};

describe("DEFAULT_CLOCK_OFFSET_TRACKER_CONFIG", () => {
  it("既定設定が現行値であること", () => {
    expect(DEFAULT_CLOCK_OFFSET_TRACKER_CONFIG).toEqual({
      sampleWindowSize: 8,
      maxSlewPerSampleMs: 50,
      rttAlpha: 0.25,
    });
  });
});

describe("ClockOffsetTracker", () => {
  it("初期状態のoffsetは0を返すこと", () => {
    const tracker = new ClockOffsetTracker();

    expect(tracker.getClockOffsetMs()).toBe(0);
  });

  it("初期状態ではoffset未取得と判定すること", () => {
    const tracker = new ClockOffsetTracker();

    expect(tracker.hasOffsetEstimate()).toBe(false);
  });

  it("初期状態のRTTはnullを返すこと", () => {
    const tracker = new ClockOffsetTracker();

    expect(tracker.getSmoothedRttMs()).toBeNull();
  });
});

describe("ClockOffsetTracker seed", () => {
  it("サーバー経過msと受信時刻の差をoffsetに設定すること", () => {
    const tracker = new ClockOffsetTracker();

    tracker.seed(5000, 1000);

    expect(tracker.getClockOffsetMs()).toBe(4000);
  });

  it("カウントダウン中の負の経過msでもoffsetを設定すること", () => {
    const tracker = new ClockOffsetTracker();

    tracker.seed(-3000, 1000);

    expect(tracker.getClockOffsetMs()).toBe(-4000);
  });

  it("seedのみでもoffset取得済みと判定すること", () => {
    const tracker = new ClockOffsetTracker();

    tracker.seed(5000, 1000);

    expect(tracker.hasOffsetEstimate()).toBe(true);
  });

  it("実測前のseedは呼び出しごとに差分を上書きすること", () => {
    const tracker = new ClockOffsetTracker();

    tracker.seed(5000, 1000);
    tracker.seed(3000, 1000);

    expect(tracker.getClockOffsetMs()).toBe(2000);
  });

  it("実測サンプル取り込み後のseedはoffsetを上書きしないこと", () => {
    const tracker = new ClockOffsetTracker();

    tracker.applySample(createSample(100, 5000));
    tracker.seed(9000, 1000);

    expect(tracker.getClockOffsetMs()).toBe(5000);
  });

  it("seedはRTTを設定しないこと", () => {
    const tracker = new ClockOffsetTracker();

    tracker.seed(5000, 1000);

    expect(tracker.getSmoothedRttMs()).toBeNull();
  });
});

describe("ClockOffsetTracker applySample", () => {
  it("初回サンプルはslewを経ず即座に採用すること", () => {
    const tracker = new ClockOffsetTracker({ maxSlewPerSampleMs: 50 });

    tracker.applySample(createSample(100, 5000));

    expect(tracker.getClockOffsetMs()).toBe(5000);
  });

  it("seed済みでも初回サンプルは即座に採用すること", () => {
    const tracker = new ClockOffsetTracker({ maxSlewPerSampleMs: 50 });

    tracker.seed(4700, 0);
    tracker.applySample(createSample(100, 5000));

    expect(tracker.getClockOffsetMs()).toBe(5000);
  });

  it("2件目以降は1サンプルあたりの上限を超えて動かないこと", () => {
    const tracker = new ClockOffsetTracker({ maxSlewPerSampleMs: 50 });

    tracker.applySample(createSample(100, 5000));
    tracker.applySample(createSample(50, 6000));

    expect(tracker.getClockOffsetMs()).toBe(5050);
  });

  it("推定値が現在値より小さい場合も上限までしか戻さないこと", () => {
    const tracker = new ClockOffsetTracker({ maxSlewPerSampleMs: 50 });

    tracker.applySample(createSample(100, 5000));
    tracker.applySample(createSample(50, 4000));

    expect(tracker.getClockOffsetMs()).toBe(4950);
  });

  it("差が上限以内なら推定値ちょうどまで動かすこと", () => {
    const tracker = new ClockOffsetTracker({ maxSlewPerSampleMs: 50 });

    tracker.applySample(createSample(100, 5000));
    tracker.applySample(createSample(50, 5030));

    expect(tracker.getClockOffsetMs()).toBe(5030);
  });

  it("上限を超える差でもサンプルを重ねれば推定値へ収束すること", () => {
    const tracker = new ClockOffsetTracker({ maxSlewPerSampleMs: 50 });

    tracker.applySample(createSample(100, 5000));
    for (let index = 0; index < 5; index += 1) {
      tracker.applySample(createSample(50, 5200));
    }

    expect(tracker.getClockOffsetMs()).toBe(5200);
  });

  it("サンプル取り込み後はoffset取得済みと判定すること", () => {
    const tracker = new ClockOffsetTracker();

    tracker.applySample(createSample(100, 5000));

    expect(tracker.hasOffsetEstimate()).toBe(true);
  });
});

describe("ClockOffsetTracker 最小RTT選択", () => {
  it("窓の中でRTTが最小のサンプルのoffsetを推定値とすること", () => {
    const tracker = new ClockOffsetTracker({
      sampleWindowSize: 4,
      maxSlewPerSampleMs: 1000,
    });

    tracker.applySample(createSample(40, 5000));
    tracker.applySample(createSample(200, 5300));

    expect(tracker.getClockOffsetMs()).toBe(5000);
  });

  it("RTTが最小でないサンプルが続いても推定値が動かないこと", () => {
    const tracker = new ClockOffsetTracker({
      sampleWindowSize: 4,
      maxSlewPerSampleMs: 1000,
    });

    tracker.applySample(createSample(40, 5000));
    tracker.applySample(createSample(200, 5300));
    tracker.applySample(createSample(300, 4600));

    expect(tracker.getClockOffsetMs()).toBe(5000);
  });

  it("より小さいRTTのサンプルが来たら推定値を更新すること", () => {
    const tracker = new ClockOffsetTracker({
      sampleWindowSize: 4,
      maxSlewPerSampleMs: 1000,
    });

    tracker.applySample(createSample(40, 5000));
    tracker.applySample(createSample(200, 5300));
    tracker.applySample(createSample(20, 4900));

    expect(tracker.getClockOffsetMs()).toBe(4900);
  });

  it("窓幅1の場合は常に最新サンプルを推定値とすること", () => {
    const tracker = new ClockOffsetTracker({
      sampleWindowSize: 1,
      maxSlewPerSampleMs: 1000,
    });

    tracker.applySample(createSample(40, 5000));
    tracker.applySample(createSample(200, 5300));

    expect(tracker.getClockOffsetMs()).toBe(5300);
  });

  it("窓が埋まった後は最古のサンプルが押し出されること", () => {
    const tracker = new ClockOffsetTracker({
      sampleWindowSize: 2,
      maxSlewPerSampleMs: 1000,
    });

    // 最初の低RTTサンプルは窓から押し出されるまで推定値を支配する
    tracker.applySample(createSample(10, 5000));
    tracker.applySample(createSample(500, 6000));
    tracker.applySample(createSample(500, 6000));

    expect(tracker.getClockOffsetMs()).toBe(6000);
  });

  it("古い最小RTTサンプルによる恒久ロックが起きないこと", () => {
    const tracker = new ClockOffsetTracker({
      sampleWindowSize: 4,
      maxSlewPerSampleMs: 1000,
    });

    // 回線が恒常的に悪化しても，窓の入れ替えで新しい水準へ追従する
    tracker.applySample(createSample(10, 5000));
    for (let index = 0; index < 4; index += 1) {
      tracker.applySample(createSample(300, 5400));
    }

    expect(tracker.getClockOffsetMs()).toBe(5400);
  });
});

describe("ClockOffsetTracker RTT平滑化", () => {
  it("初回サンプルのRTTをそのまま採用すること", () => {
    const tracker = new ClockOffsetTracker({ rttAlpha: 0.25 });

    tracker.applySample(createSample(100, 5000));

    expect(tracker.getSmoothedRttMs()).toBe(100);
  });

  it("2件目以降のRTTをEWMAで更新すること", () => {
    const tracker = new ClockOffsetTracker({ rttAlpha: 0.25 });

    tracker.applySample(createSample(100, 5000));
    tracker.applySample(createSample(200, 5000));

    expect(tracker.getSmoothedRttMs()).toBeCloseTo(125, 10);
  });

  it("RTTには最小値ではなく典型値を保持すること", () => {
    const tracker = new ClockOffsetTracker({ rttAlpha: 0.25 });

    tracker.applySample(createSample(100, 5000));
    tracker.applySample(createSample(500, 5000));

    // offset推定は最小RTTサンプルを使うが，RTT自体は最小へ張り付かない
    expect(tracker.getSmoothedRttMs()).toBeGreaterThan(100);
  });

  it("係数1のEWMAでは最新RTTをそのまま採用すること", () => {
    const tracker = new ClockOffsetTracker({ rttAlpha: 1 });

    tracker.applySample(createSample(100, 5000));
    tracker.applySample(createSample(200, 5000));

    expect(tracker.getSmoothedRttMs()).toBe(200);
  });
});

describe("ClockOffsetTracker 片側遅延への耐性", () => {
  it("片道遅延が非対称なサンプルが混入しても推定値が汚染されないこと", () => {
    const tracker = new ClockOffsetTracker({
      sampleWindowSize: 8,
      maxSlewPerSampleMs: 1000,
    });
    const trueOffsetMs = 5000;

    // 往復が対称な低RTTサンプルは真値ちょうどのoffsetを与える
    tracker.applySample(createSample(40, trueOffsetMs));
    // 復路だけキューイングした非対称サンプルはoffsetが過小に見積もられる
    tracker.applySample(createSample(400, trueOffsetMs - 180));
    tracker.applySample(createSample(600, trueOffsetMs - 280));

    // 平均化する方式なら誤差が乗るが，最小RTTサンプルの採用なら真値のまま
    expect(tracker.getClockOffsetMs()).toBe(trueOffsetMs);
  });

  it("往路だけ遅いサンプルが混入しても推定値が汚染されないこと", () => {
    const tracker = new ClockOffsetTracker({
      sampleWindowSize: 8,
      maxSlewPerSampleMs: 1000,
    });
    const trueOffsetMs = 5000;

    tracker.applySample(createSample(40, trueOffsetMs));
    // 往路が遅い場合はoffsetが過大に見積もられる
    tracker.applySample(createSample(400, trueOffsetMs + 180));
    tracker.applySample(createSample(600, trueOffsetMs + 280));

    expect(tracker.getClockOffsetMs()).toBe(trueOffsetMs);
  });

  it("非対称サンプルが多数派でも最小RTTサンプルを優先すること", () => {
    const tracker = new ClockOffsetTracker({
      sampleWindowSize: 8,
      maxSlewPerSampleMs: 1000,
    });
    const trueOffsetMs = 5000;

    tracker.applySample(createSample(40, trueOffsetMs));
    for (let index = 0; index < 6; index += 1) {
      tracker.applySample(createSample(500, trueOffsetMs - 230));
    }

    expect(tracker.getClockOffsetMs()).toBe(trueOffsetMs);
  });
});

describe("ClockOffsetTracker reset", () => {
  it("resetでoffsetを初期化すること", () => {
    const tracker = new ClockOffsetTracker();

    tracker.applySample(createSample(100, 5000));
    tracker.reset();

    expect(tracker.getClockOffsetMs()).toBe(0);
  });

  it("resetでoffset未取得の状態へ戻すこと", () => {
    const tracker = new ClockOffsetTracker();

    tracker.seed(5000, 1000);
    tracker.reset();

    expect(tracker.hasOffsetEstimate()).toBe(false);
  });

  it("resetでRTTを初期化すること", () => {
    const tracker = new ClockOffsetTracker();

    tracker.applySample(createSample(100, 5000));
    tracker.reset();

    expect(tracker.getSmoothedRttMs()).toBeNull();
  });

  it("reset後のseedが再び有効になること", () => {
    const tracker = new ClockOffsetTracker();

    tracker.applySample(createSample(100, 5000));
    tracker.reset();
    tracker.seed(9000, 1000);

    expect(tracker.getClockOffsetMs()).toBe(8000);
  });

  it("reset後の初回サンプルは再びslewを経ず採用されること", () => {
    const tracker = new ClockOffsetTracker({ maxSlewPerSampleMs: 50 });

    tracker.applySample(createSample(100, 5000));
    tracker.reset();
    tracker.applySample(createSample(100, 9000));

    expect(tracker.getClockOffsetMs()).toBe(9000);
  });
});

describe("ClockOffsetTracker 設定値検証", () => {
  it("窓幅が1未満の場合は例外を投げること", () => {
    expect(() => new ClockOffsetTracker({ sampleWindowSize: 0 })).toThrow();
  });

  it("窓幅が非整数の場合は例外を投げること", () => {
    expect(() => new ClockOffsetTracker({ sampleWindowSize: 1.5 })).toThrow();
  });

  it("窓幅1は許容すること", () => {
    expect(() => new ClockOffsetTracker({ sampleWindowSize: 1 })).not.toThrow();
  });

  it("slew上限が0の場合は例外を投げること", () => {
    expect(() => new ClockOffsetTracker({ maxSlewPerSampleMs: 0 })).toThrow();
  });

  it("slew上限が負値の場合は例外を投げること", () => {
    expect(() => new ClockOffsetTracker({ maxSlewPerSampleMs: -1 })).toThrow();
  });

  it("slew上限が非有限の場合は例外を投げること", () => {
    expect(
      () =>
        new ClockOffsetTracker({
          maxSlewPerSampleMs: Number.POSITIVE_INFINITY,
        }),
    ).toThrow();
  });

  it("RTT係数が0の場合は例外を投げること", () => {
    expect(() => new ClockOffsetTracker({ rttAlpha: 0 })).toThrow();
  });

  it("RTT係数が1を超える場合は例外を投げること", () => {
    expect(() => new ClockOffsetTracker({ rttAlpha: 1.5 })).toThrow();
  });

  it("RTT係数がNaNの場合は例外を投げること", () => {
    expect(() => new ClockOffsetTracker({ rttAlpha: Number.NaN })).toThrow();
  });

  it("RTT係数1は許容すること", () => {
    expect(() => new ClockOffsetTracker({ rttAlpha: 1 })).not.toThrow();
  });

  it("既定設定では例外を投げないこと", () => {
    expect(() => new ClockOffsetTracker()).not.toThrow();
  });
});
