/**
 * ClockSyncService.test
 * 時刻同期サービスの挙動を検証するテスト
 * seed・PONG取り込み・同期時刻算出・間隔推奨と部分設定の合成を検証する
 */
import { describe, expect, it, vi } from "vitest";

import {
  ClockSyncService,
  DEFAULT_CLOCK_SYNC_CONFIG,
  type PartialClockSyncConfig,
} from "./ClockSyncService";

/** 固定時刻を返す時刻取得スタブを生成する */
const createFixedNowProvider = (nowMs: number) => {
  return () => nowMs;
};

/** 検証で仮定する真の時計差分ミリ秒 */
const TRUE_OFFSET_MS = 5000;

type ConsistentPongParams = {
  service: ClockSyncService;
  oneWayDelayMs: number;
  sampleCount: number;
  trueOffsetMs?: number;
};

/** 真の時計差分と片道遅延が一貫したPONG列を取り込む */
const applyConsistentPongs = ({
  service,
  oneWayDelayMs,
  sampleCount,
  trueOffsetMs = TRUE_OFFSET_MS,
}: ConsistentPongParams): void => {
  for (let index = 0; index < sampleCount; index += 1) {
    const clientTimeMs = 2000 + index * 3000;
    service.updateFromPong(
      {
        clientTime: clientTimeMs,
        serverTime: clientTimeMs + oneWayDelayMs + trueOffsetMs,
      },
      clientTimeMs + oneWayDelayMs * 2,
    );
  }
};

/** 片道遅延ぶん過小になるGAME_START時のseedを再現する */
const seedWithOneWayDelay = (
  service: ClockSyncService,
  oneWayDelayMs: number,
): void => {
  service.seedFromServerNow(1000 - oneWayDelayMs + TRUE_OFFSET_MS, 1000);
};

/** 指定した片道遅延でseedとPONG取り込みを行った後のoffsetを返す */
const measureConvergedOffsetMs = (oneWayDelayMs: number): number => {
  const service = new ClockSyncService({}, createFixedNowProvider(1000));

  seedWithOneWayDelay(service, oneWayDelayMs);
  applyConsistentPongs({ service, oneWayDelayMs, sampleCount: 5 });

  return service.getClockOffsetMs();
};

describe("DEFAULT_CLOCK_SYNC_CONFIG", () => {
  it("既定設定がクライアント設定値と一致すること", () => {
    expect(DEFAULT_CLOCK_SYNC_CONFIG).toEqual({
      estimator: { maxAcceptedRttMs: 1000 },
      smoother: {
        offsetAlpha: 0.12,
        rttAlpha: 0.25,
        maxAcceptedOffsetJumpMs: 250,
        maxConsecutiveRejectedSamples: 3,
      },
      intervalPolicy: {
        defaultIntervalMs: 3000,
        lowLatencyThresholdMs: 80,
        mediumLatencyThresholdMs: 180,
        lowLatencyIntervalMs: 5000,
        mediumLatencyIntervalMs: 3000,
        highLatencyIntervalMs: 2000,
      },
    });
  });
});

describe("ClockSyncService", () => {
  it("初期状態のoffsetは0を返すこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    expect(service.getClockOffsetMs()).toBe(0);
  });

  it("初期状態の同期時刻はローカル時刻と一致すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    expect(service.getSynchronizedNowMs()).toBe(1000);
  });

  it("seedFromServerNowで受信時刻を省略した場合は時刻取得関数を使うこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerNow(5000);

    expect(service.getClockOffsetMs()).toBe(4000);
  });

  it("seedFromServerNowで受信時刻を指定した場合はその値で差分を求めること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerNow(5000, 2000);

    expect(service.getClockOffsetMs()).toBe(3000);
  });

  it("seed後の同期時刻がローカル時刻にoffsetを加えた値になること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerNow(5000);

    expect(service.getSynchronizedNowMs()).toBe(5000);
  });

  it("PONG取り込みでoffsetを平滑化して更新すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerNow(5000);
    // 暫定seedは最初のPONGで実測値に置換されるため，2件目からEWMAが効く
    service.updateFromPong({ clientTime: 900, serverTime: 5000 });
    service.updateFromPong({ clientTime: 900, serverTime: 5100 });

    expect(service.getClockOffsetMs()).toBeCloseTo(4062, 10);
  });

  it("PONG取り込みで受信時刻を指定した場合はその値でRTTを求めること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.updateFromPong({ clientTime: 900, serverTime: 5000 }, 1200);

    expect(service.getRecommendedSyncIntervalMs()).toBe(2000);
  });

  it("RTTが許容外のPONGはoffsetへ反映しないこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerNow(5000);
    service.updateFromPong({ clientTime: 900, serverTime: 5000 }, 3000);

    expect(service.getClockOffsetMs()).toBe(4000);
  });

  it("RTTが許容外のPONGは推奨間隔にも反映しないこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.updateFromPong({ clientTime: 900, serverTime: 5000 }, 3000);

    expect(service.getRecommendedSyncIntervalMs()).toBe(3000);
  });

  it("RTT未計測時は既定の推奨間隔を返すこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    expect(service.getRecommendedSyncIntervalMs()).toBe(3000);
  });

  it("低遅延のPONGを取り込むと長い推奨間隔を返すこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.updateFromPong({ clientTime: 950, serverTime: 5000 });

    expect(service.getRecommendedSyncIntervalMs()).toBe(5000);
  });

  it("中遅延のPONGを取り込むと中間の推奨間隔を返すこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.updateFromPong({ clientTime: 900, serverTime: 5000 });

    expect(service.getRecommendedSyncIntervalMs()).toBe(3000);
  });

  it("resetでoffsetを初期化すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerNow(5000);
    service.reset();

    expect(service.getClockOffsetMs()).toBe(0);
  });

  it("resetで推奨間隔を既定値へ戻すこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.updateFromPong({ clientTime: 950, serverTime: 5000 });
    service.reset();

    expect(service.getRecommendedSyncIntervalMs()).toBe(3000);
  });

  it("estimator設定を上書きした場合は上書き後の許容RTTで判定すること", () => {
    const service = new ClockSyncService(
      { estimator: { maxAcceptedRttMs: 10 } },
      createFixedNowProvider(1000),
    );

    service.seedFromServerNow(5000);
    service.updateFromPong({ clientTime: 900, serverTime: 5000 });

    expect(service.getClockOffsetMs()).toBe(4000);
  });

  it("intervalPolicy設定を上書きした場合は上書き後の間隔を返すこと", () => {
    const service = new ClockSyncService(
      { intervalPolicy: { defaultIntervalMs: 111 } },
      createFixedNowProvider(1000),
    );

    expect(service.getRecommendedSyncIntervalMs()).toBe(111);
  });

  it("intervalPolicy設定の未指定項目には既定値を使うこと", () => {
    const service = new ClockSyncService(
      { intervalPolicy: { defaultIntervalMs: 111 } },
      createFixedNowProvider(1000),
    );

    service.updateFromPong({ clientTime: 950, serverTime: 5000 });

    expect(service.getRecommendedSyncIntervalMs()).toBe(5000);
  });

  it("smoother設定をネスト単位で部分指定できること", () => {
    // ネスト単位で省略できる PartialClockSyncConfig を型注釈で明示する
    const config: PartialClockSyncConfig = {
      smoother: { offsetAlpha: 1 },
    };
    const service = new ClockSyncService(config, createFixedNowProvider(1000));

    service.seedFromServerNow(5000);
    service.updateFromPong({ clientTime: 900, serverTime: 5100 });

    expect(service.getClockOffsetMs()).toBe(4150);
  });

  it("smoother設定の未指定項目には既定値を使うこと", () => {
    const service = new ClockSyncService(
      { smoother: { offsetAlpha: 1 } },
      createFixedNowProvider(1000),
    );

    service.seedFromServerNow(5000);
    // 最初のPONGで暫定seedを置換し，実測ベースライン4050msを確立する
    service.updateFromPong({ clientTime: 900, serverTime: 5000 });
    // 既定の maxAcceptedOffsetJumpMs（250ms）を超える跳躍は棄却される
    service.updateFromPong({ clientTime: 900, serverTime: 5500 });

    expect(service.getClockOffsetMs()).toBe(4050);
  });

  it("設定を省略した場合は既定の推奨間隔を返すこと", () => {
    const service = new ClockSyncService(undefined, createFixedNowProvider(1000));

    expect(service.getRecommendedSyncIntervalMs()).toBe(3000);
  });

  it("時刻取得関数を省略した場合はDate.nowを使うこと", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1000);
    const service = new ClockSyncService();

    service.seedFromServerNow(5000);
    const synchronizedNowMs = service.getSynchronizedNowMs();
    nowSpy.mockRestore();

    expect(synchronizedNowMs).toBe(5000);
  });

  it("片道遅延300msのseed後でも一貫したPONGでoffsetが真値へ収束すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    // RTT600ms相当ではseedが4700msとなり，真値との差300msが跳躍しきい値を超える
    seedWithOneWayDelay(service, 300);
    applyConsistentPongs({ service, oneWayDelayMs: 300, sampleCount: 5 });

    expect(service.getClockOffsetMs()).toBeCloseTo(TRUE_OFFSET_MS, 6);
  });

  it("片道遅延が許容跳躍未満でもoffsetが真値へ収束すること", () => {
    expect(measureConvergedOffsetMs(249)).toBeCloseTo(TRUE_OFFSET_MS, 6);
  });

  it("片道遅延が許容跳躍を超えてもoffsetが真値へ収束すること", () => {
    expect(measureConvergedOffsetMs(251)).toBeCloseTo(TRUE_OFFSET_MS, 6);
  });

  it("許容跳躍の境界前後でoffsetの収束結果に崖が生じないこと", () => {
    expect(measureConvergedOffsetMs(251)).toBeCloseTo(
      measureConvergedOffsetMs(249),
      6,
    );
  });

  it("時計差分が大きく変化しても連続棄却の上限を超えれば追従すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    seedWithOneWayDelay(service, 20);
    applyConsistentPongs({ service, oneWayDelayMs: 20, sampleCount: 5 });
    // 経路変更でサーバー時刻が2000msずれた状況を再現する
    applyConsistentPongs({
      service,
      oneWayDelayMs: 20,
      sampleCount: 4,
      trueOffsetMs: TRUE_OFFSET_MS + 2000,
    });

    expect(service.getClockOffsetMs()).toBeCloseTo(TRUE_OFFSET_MS + 2000, 6);
  });

  it("seedFromServerNowは測定済みoffsetを上書きしないこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    applyConsistentPongs({ service, oneWayDelayMs: 20, sampleCount: 1 });
    service.seedFromServerNow(9000, 1000);

    expect(service.getClockOffsetMs()).toBeCloseTo(TRUE_OFFSET_MS, 6);
  });
});
