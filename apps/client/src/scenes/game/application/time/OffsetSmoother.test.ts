/**
 * OffsetSmoother.test
 * 時計差分とRTT平滑化の仕様を検証するテスト
 * 暫定seedの置換・EWMA更新・外れ値除外の境界・連続棄却からの復帰を検証する
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
      maxConsecutiveRejectedSamples: 3,
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

  it("実測前のseedは呼び出しごとに差分を上書きすること", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);
    smoother.seed(3000, 1000);

    expect(smoother.getClockOffsetMs()).toBe(2000);
  });

  it("seedは測定済みoffsetを上書きしないこと", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 100, offsetMs: 5000 });
    smoother.seed(9000, 1000);

    expect(smoother.getClockOffsetMs()).toBe(5000);
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

  it("seed直後の最初の有効サンプルはoffsetを実測値で置換すること", () => {
    const smoother = new OffsetSmoother();

    // seedは片道遅延ぶん過小な暫定値なので，跳躍量にかかわらず実測値へ置き換わる
    smoother.seed(5700, 1000);
    smoother.applySample({ rttMs: 600, offsetMs: 5000 });

    expect(smoother.getClockOffsetMs()).toBe(5000);
  });

  it("片道遅延300ms相当のseedからでもoffsetが真値へ収束すること", () => {
    const smoother = new OffsetSmoother();

    // 真のoffset5000msに対し，seedは片道遅延300msぶん過小な4700msになる
    smoother.seed(5700, 1000);
    for (let index = 0; index < 5; index += 1) {
      smoother.applySample({ rttMs: 600, offsetMs: 5000 });
    }

    expect(smoother.getClockOffsetMs()).toBeCloseTo(5000, 6);
  });

  it("実測サンプルで確立したoffsetを以降はEWMAで更新すること", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);
    // 暫定seedは最初の有効サンプルで置換されるため，2件目からEWMAが効く
    smoother.applySample({ rttMs: 10, offsetMs: 4000 });
    smoother.applySample({ rttMs: 10, offsetMs: 4100 });

    expect(smoother.getClockOffsetMs()).toBeCloseTo(4012, 10);
  });

  it("offset差が許容跳躍ちょうどの場合は取り込むこと", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 10, offsetMs: 4000 });
    smoother.applySample({ rttMs: 10, offsetMs: 4250 });

    expect(smoother.getClockOffsetMs()).toBeCloseTo(4030, 10);
  });

  it("offset差が許容跳躍を超える場合はoffsetを更新しないこと", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 10, offsetMs: 4000 });
    smoother.applySample({ rttMs: 10, offsetMs: 4251 });

    expect(smoother.getClockOffsetMs()).toBe(4000);
  });

  it("負方向の跳躍も許容跳躍を超える場合は棄却すること", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 10, offsetMs: 4000 });
    smoother.applySample({ rttMs: 10, offsetMs: 3749 });

    expect(smoother.getClockOffsetMs()).toBe(4000);
  });

  it("棄却サンプルは計測済みRTTも書き換えないこと", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);
    smoother.applySample({ rttMs: 100, offsetMs: 4000 });
    smoother.applySample({ rttMs: 900, offsetMs: 99999 });

    expect(smoother.getSmoothedRttMs()).toBe(100);
  });

  it("棄却サンプルの直後でも有効サンプルはRTTを更新すること", () => {
    const smoother = new OffsetSmoother();

    smoother.seed(5000, 1000);
    smoother.applySample({ rttMs: 100, offsetMs: 4000 });
    smoother.applySample({ rttMs: 900, offsetMs: 99999 });
    smoother.applySample({ rttMs: 300, offsetMs: 4000 });

    expect(smoother.getSmoothedRttMs()).toBe(150);
  });

  it("ベースライン再構築サンプルでもRTTをEWMAで更新すること", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 100, offsetMs: 4000 });
    // 連続棄却の上限まで外れ値を与え，次のサンプルでベースラインを組み直させる
    for (let index = 0; index < 3; index += 1) {
      smoother.applySample({ rttMs: 999, offsetMs: 9000 });
    }
    smoother.applySample({ rttMs: 300, offsetMs: 9000 });

    expect(smoother.getSmoothedRttMs()).toBe(150);
  });

  it("連続棄却が上限に達するまではoffsetを保持すること", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 10, offsetMs: 4000 });
    for (let index = 0; index < 3; index += 1) {
      smoother.applySample({ rttMs: 10, offsetMs: 9000 });
    }

    expect(smoother.getClockOffsetMs()).toBe(4000);
  });

  it("連続棄却が上限に達した後のサンプルでベースラインを組み直すこと", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 10, offsetMs: 4000 });
    for (let index = 0; index < 4; index += 1) {
      smoother.applySample({ rttMs: 10, offsetMs: 9000 });
    }

    expect(smoother.getClockOffsetMs()).toBe(9000);
  });

  it("サンプル採用で連続棄却の数え直しが行われること", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 10, offsetMs: 4000 });
    smoother.applySample({ rttMs: 10, offsetMs: 9000 });
    smoother.applySample({ rttMs: 10, offsetMs: 9000 });
    // 採用サンプルでカウンタが0に戻るため，以降2回棄却してもベースラインは保たれる
    smoother.applySample({ rttMs: 10, offsetMs: 4100 });
    smoother.applySample({ rttMs: 10, offsetMs: 9000 });
    smoother.applySample({ rttMs: 10, offsetMs: 9000 });

    expect(smoother.getClockOffsetMs()).toBeCloseTo(4012, 10);
  });

  it("連続棄却の許容回数を設定で変更できること", () => {
    const smoother = new OffsetSmoother({ maxConsecutiveRejectedSamples: 1 });

    smoother.applySample({ rttMs: 10, offsetMs: 4000 });
    smoother.applySample({ rttMs: 10, offsetMs: 9000 });
    smoother.applySample({ rttMs: 10, offsetMs: 9000 });

    expect(smoother.getClockOffsetMs()).toBe(9000);
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

  it("reset後のseedは再び暫定値として反映されること", () => {
    const smoother = new OffsetSmoother();

    smoother.applySample({ rttMs: 100, offsetMs: 5000 });
    smoother.reset();
    smoother.seed(9000, 1000);

    expect(smoother.getClockOffsetMs()).toBe(8000);
  });

  it("設定を部分指定した場合は指定値のみ上書きすること", () => {
    const smoother = new OffsetSmoother({ offsetAlpha: 0.5 });

    smoother.seed(1000, 0);
    smoother.applySample({ rttMs: 10, offsetMs: 1000 });
    smoother.applySample({ rttMs: 10, offsetMs: 1200 });

    expect(smoother.getClockOffsetMs()).toBe(1100);
  });
});
