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

describe("DEFAULT_CLOCK_SYNC_CONFIG", () => {
  it("既定設定がクライアント設定値と一致すること", () => {
    expect(DEFAULT_CLOCK_SYNC_CONFIG).toEqual({
      estimator: { maxAcceptedRttMs: 1000 },
      smoother: {
        offsetAlpha: 0.12,
        rttAlpha: 0.25,
        maxAcceptedOffsetJumpMs: 250,
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
    service.updateFromPong({ clientTime: 900, serverTime: 5000 });

    expect(service.getClockOffsetMs()).toBeCloseTo(4006, 10);
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
    // 既定の maxAcceptedOffsetJumpMs（250ms）を超える跳躍は棄却される
    service.updateFromPong({ clientTime: 900, serverTime: 5500 });

    expect(service.getClockOffsetMs()).toBe(4000);
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
});
