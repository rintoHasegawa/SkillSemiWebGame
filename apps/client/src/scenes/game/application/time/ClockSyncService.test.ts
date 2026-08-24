/**
 * ClockSyncService.test
 * 単調時計からサーバーのゲーム経過msへの変換を管理する仕様を検証する
 * seed・PONG取り込み・経過ms算出・間隔推奨と部分設定の合成を検証する
 */
import { describe, expect, it, vi } from "vitest";

import type { PongPayload } from "@repo/shared";

import {
  ClockSyncService,
  DEFAULT_CLOCK_SYNC_CONFIG,
  type PartialClockSyncConfig,
} from "./ClockSyncService";

/** 固定時刻を返す単調時計スタブを生成する */
const createFixedNowProvider = (nowMs: number) => {
  return () => nowMs;
};

/** 検証で仮定する真のoffsetミリ秒（単調時計→ゲーム経過ms） */
const TRUE_OFFSET_MS = 5000;

type PongExchangeParams = {
  clientSentAtMs: number;
  forwardDelayMs: number;
  backwardDelayMs: number;
  trueOffsetMs?: number;
  serverProcessingMs?: number;
};

type PongExchange = {
  payload: PongPayload;
  receivedAtMs: number;
};

/** 真のoffsetと経路遅延から実際に観測されるPING/PONG往復を組み立てる */
const createPongExchange = ({
  clientSentAtMs,
  forwardDelayMs,
  backwardDelayMs,
  trueOffsetMs = TRUE_OFFSET_MS,
  serverProcessingMs = 0,
}: PongExchangeParams): PongExchange => {
  const serverReceivedElapsedMs =
    clientSentAtMs + forwardDelayMs + trueOffsetMs;

  return {
    payload: {
      clientTime: clientSentAtMs,
      serverReceivedElapsedMs,
      serverSentElapsedMs: serverReceivedElapsedMs + serverProcessingMs,
    },
    receivedAtMs:
      clientSentAtMs + forwardDelayMs + backwardDelayMs + serverProcessingMs,
  };
};

type ConsistentPongParams = {
  service: ClockSyncService;
  oneWayDelayMs: number;
  sampleCount: number;
  trueOffsetMs?: number;
  startClientTimeMs?: number;
};

/** 真のoffsetと片道遅延が一貫したPONG列を取り込む */
const applyConsistentPongs = ({
  service,
  oneWayDelayMs,
  sampleCount,
  trueOffsetMs = TRUE_OFFSET_MS,
  startClientTimeMs = 2000,
}: ConsistentPongParams): void => {
  for (let index = 0; index < sampleCount; index += 1) {
    const { payload, receivedAtMs } = createPongExchange({
      clientSentAtMs: startClientTimeMs + index * 3000,
      forwardDelayMs: oneWayDelayMs,
      backwardDelayMs: oneWayDelayMs,
      trueOffsetMs,
    });
    service.updateFromPong(payload, receivedAtMs);
  }
};

/** 片道遅延ぶん過小になるGAME_START時のseedを再現する */
const seedWithOneWayDelay = (
  service: ClockSyncService,
  oneWayDelayMs: number,
): void => {
  // 送信時点のゲーム経過msは受信時点より片道遅延ぶん古い
  service.seedFromServerElapsed(1000 - oneWayDelayMs + TRUE_OFFSET_MS, 1000);
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
      offsetTracker: {
        sampleWindowSize: 8,
        maxSlewPerSampleMs: 50,
        rttAlpha: 0.25,
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

describe("ClockSyncService 初期状態", () => {
  it("初期状態のoffsetは0を返すこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    expect(service.getClockOffsetMs()).toBe(0);
  });

  it("初期状態では時計未同期と判定すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    expect(service.hasClockEstimate()).toBe(false);
  });

  it("時計未同期の間は経過msにnullを返すこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    expect(service.getElapsedMs()).toBeNull();
  });

  it("reset後は経過msがnullに戻ること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerElapsed(5000);
    service.reset();

    expect(service.getElapsedMs()).toBeNull();
  });
});

describe("ClockSyncService seedFromServerElapsed", () => {
  it("受信時刻を省略した場合は単調時計の現在値を使うこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerElapsed(5000);

    expect(service.getClockOffsetMs()).toBe(4000);
  });

  it("受信時刻を指定した場合はその値で差分を求めること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerElapsed(5000, 2000);

    expect(service.getClockOffsetMs()).toBe(3000);
  });

  it("seed後は時計同期済みと判定すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerElapsed(5000);

    expect(service.hasClockEstimate()).toBe(true);
  });

  it("seed後の経過msがローカル時刻にoffsetを加えた値になること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerElapsed(5000);

    expect(service.getElapsedMs()).toBe(5000);
  });

  it("カウントダウン中の負の経過msをそのまま再現すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerElapsed(-3000);

    expect(service.getElapsedMs()).toBe(-3000);
  });

  it("測定済みoffsetを上書きしないこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    applyConsistentPongs({ service, oneWayDelayMs: 20, sampleCount: 1 });
    service.seedFromServerElapsed(9000, 1000);

    expect(service.getClockOffsetMs()).toBeCloseTo(TRUE_OFFSET_MS, 6);
  });
});

describe("ClockSyncService updateFromPong", () => {
  it("PONG取り込みでoffsetを実測値へ更新すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));
    const { payload, receivedAtMs } = createPongExchange({
      clientSentAtMs: 2000,
      forwardDelayMs: 50,
      backwardDelayMs: 50,
    });

    service.updateFromPong(payload, receivedAtMs);

    expect(service.getClockOffsetMs()).toBeCloseTo(TRUE_OFFSET_MS, 6);
  });

  it("PONG取り込み後は時計同期済みと判定すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));
    const { payload, receivedAtMs } = createPongExchange({
      clientSentAtMs: 2000,
      forwardDelayMs: 50,
      backwardDelayMs: 50,
    });

    service.updateFromPong(payload, receivedAtMs);

    expect(service.hasClockEstimate()).toBe(true);
  });

  it("受信時刻を省略した場合は単調時計の現在値でRTTを求めること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.updateFromPong({
      clientTime: 900,
      serverReceivedElapsedMs: 5000,
      serverSentElapsedMs: 5000,
    });

    // RTT100msは中遅延帯に入る
    expect(service.getRecommendedSyncIntervalMs()).toBe(3000);
  });

  it("受信時刻を指定した場合はその値でRTTを求めること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.updateFromPong(
      {
        clientTime: 900,
        serverReceivedElapsedMs: 5000,
        serverSentElapsedMs: 5000,
      },
      1200,
    );

    // RTT300msは高遅延帯に入る
    expect(service.getRecommendedSyncIntervalMs()).toBe(2000);
  });

  it("サーバー滞留時間はRTT判定から除外すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));
    const { payload, receivedAtMs } = createPongExchange({
      clientSentAtMs: 900,
      forwardDelayMs: 20,
      backwardDelayMs: 20,
      serverProcessingMs: 500,
    });

    service.updateFromPong(payload, receivedAtMs);

    // 滞留500msを含めれば高遅延だが，往復40msのみを見るので低遅延帯となる
    expect(service.getRecommendedSyncIntervalMs()).toBe(5000);
  });

  it("RTTが許容外のPONGはoffsetへ反映しないこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerElapsed(5000);
    service.updateFromPong(
      {
        clientTime: 900,
        serverReceivedElapsedMs: 5000,
        serverSentElapsedMs: 5000,
      },
      3000,
    );

    expect(service.getClockOffsetMs()).toBe(4000);
  });

  it("RTTが許容外のPONGだけでは時計同期済みとしないこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.updateFromPong(
      {
        clientTime: 900,
        serverReceivedElapsedMs: 5000,
        serverSentElapsedMs: 5000,
      },
      3000,
    );

    expect(service.hasClockEstimate()).toBe(false);
  });

  it("RTTが許容外のPONGは推奨間隔にも反映しないこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.updateFromPong(
      {
        clientTime: 900,
        serverReceivedElapsedMs: 5000,
        serverSentElapsedMs: 5000,
      },
      3000,
    );

    expect(service.getRecommendedSyncIntervalMs()).toBe(3000);
  });
});

describe("ClockSyncService 同期精度", () => {
  it("片道遅延300msのseed後でも一貫したPONGでoffsetが真値へ収束すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    // RTT600ms相当ではseedが4700msとなり真値より300ms過小になる
    seedWithOneWayDelay(service, 300);
    expect(service.getClockOffsetMs()).toBe(TRUE_OFFSET_MS - 300);

    applyConsistentPongs({ service, oneWayDelayMs: 300, sampleCount: 5 });

    expect(service.getClockOffsetMs()).toBeCloseTo(TRUE_OFFSET_MS, 6);
  });

  it("片道遅延が小さい場合もoffsetが真値へ収束すること", () => {
    expect(measureConvergedOffsetMs(20)).toBeCloseTo(TRUE_OFFSET_MS, 6);
  });

  it("片道遅延の大小で収束結果に差が生じないこと", () => {
    expect(measureConvergedOffsetMs(300)).toBeCloseTo(
      measureConvergedOffsetMs(20),
      6,
    );
  });

  it("収束後の経過msがサーバーのゲーム経過msと一致すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    seedWithOneWayDelay(service, 300);
    applyConsistentPongs({ service, oneWayDelayMs: 300, sampleCount: 5 });

    // 単調時計1000msの時点でサーバーのゲーム経過は1000+真のoffset
    expect(service.getElapsedMs()).toBeCloseTo(1000 + TRUE_OFFSET_MS, 6);
  });

  it("カウントダウン中のPONGでも負の経過msへ収束すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    applyConsistentPongs({
      service,
      oneWayDelayMs: 20,
      sampleCount: 3,
      trueOffsetMs: -4000,
    });

    expect(service.getElapsedMs()).toBeCloseTo(-3000, 6);
  });

  it("片道遅延が非対称なPONGが混入してもoffsetが汚染されないこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    applyConsistentPongs({ service, oneWayDelayMs: 20, sampleCount: 1 });
    // 復路だけ400ms滞留した非対称サンプルは真値より190ms小さいoffsetを示す
    const asymmetric = createPongExchange({
      clientSentAtMs: 8000,
      forwardDelayMs: 20,
      backwardDelayMs: 400,
    });
    service.updateFromPong(asymmetric.payload, asymmetric.receivedAtMs);

    expect(service.getClockOffsetMs()).toBeCloseTo(TRUE_OFFSET_MS, 6);
  });

  it("非対称サンプルが多数派でも最小RTTサンプルの推定を保つこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    applyConsistentPongs({ service, oneWayDelayMs: 20, sampleCount: 1 });
    for (let index = 0; index < 6; index += 1) {
      const asymmetric = createPongExchange({
        clientSentAtMs: 8000 + index * 3000,
        forwardDelayMs: 400,
        backwardDelayMs: 20,
      });
      service.updateFromPong(asymmetric.payload, asymmetric.receivedAtMs);
    }

    expect(service.getClockOffsetMs()).toBeCloseTo(TRUE_OFFSET_MS, 6);
  });

  it("推定値が変化しても1サンプルあたりの追従量を制限すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    // 高RTTのサンプルで基準を作り，より低RTTの新しい水準へ切り替える
    applyConsistentPongs({ service, oneWayDelayMs: 100, sampleCount: 1 });
    applyConsistentPongs({
      service,
      oneWayDelayMs: 20,
      sampleCount: 1,
      trueOffsetMs: TRUE_OFFSET_MS + 500,
      startClientTimeMs: 20000,
    });

    expect(service.getClockOffsetMs()).toBeCloseTo(TRUE_OFFSET_MS + 50, 6);
  });

  it("追従量が制限されてもサンプルを重ねれば新しい水準へ到達すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    applyConsistentPongs({ service, oneWayDelayMs: 100, sampleCount: 1 });
    applyConsistentPongs({
      service,
      oneWayDelayMs: 20,
      sampleCount: 10,
      trueOffsetMs: TRUE_OFFSET_MS + 500,
      startClientTimeMs: 20000,
    });

    expect(service.getClockOffsetMs()).toBeCloseTo(TRUE_OFFSET_MS + 500, 6);
  });
});

describe("ClockSyncService 推奨同期間隔", () => {
  it("RTT未計測時は既定の推奨間隔を返すこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    expect(service.getRecommendedSyncIntervalMs()).toBe(3000);
  });

  it("低遅延のPONGを取り込むと長い推奨間隔を返すこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.updateFromPong({
      clientTime: 950,
      serverReceivedElapsedMs: 5000,
      serverSentElapsedMs: 5000,
    });

    expect(service.getRecommendedSyncIntervalMs()).toBe(5000);
  });

  it("高遅延のPONGを取り込むと短い推奨間隔を返すこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.updateFromPong({
      clientTime: 700,
      serverReceivedElapsedMs: 5000,
      serverSentElapsedMs: 5000,
    });

    expect(service.getRecommendedSyncIntervalMs()).toBe(2000);
  });
});

describe("ClockSyncService reset", () => {
  it("resetでoffsetを初期化すること", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.seedFromServerElapsed(5000);
    service.reset();

    expect(service.getClockOffsetMs()).toBe(0);
  });

  it("resetで時計未同期の状態へ戻すこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    applyConsistentPongs({ service, oneWayDelayMs: 20, sampleCount: 1 });
    service.reset();

    expect(service.hasClockEstimate()).toBe(false);
  });

  it("resetで推奨間隔を既定値へ戻すこと", () => {
    const service = new ClockSyncService({}, createFixedNowProvider(1000));

    service.updateFromPong({
      clientTime: 950,
      serverReceivedElapsedMs: 5000,
      serverSentElapsedMs: 5000,
    });
    service.reset();

    expect(service.getRecommendedSyncIntervalMs()).toBe(3000);
  });
});

describe("ClockSyncService 設定合成", () => {
  it("estimator設定を上書きした場合は上書き後の許容RTTで判定すること", () => {
    const service = new ClockSyncService(
      { estimator: { maxAcceptedRttMs: 10 } },
      createFixedNowProvider(1000),
    );

    service.seedFromServerElapsed(5000);
    service.updateFromPong({
      clientTime: 900,
      serverReceivedElapsedMs: 5000,
      serverSentElapsedMs: 5000,
    });

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

    service.updateFromPong({
      clientTime: 950,
      serverReceivedElapsedMs: 5000,
      serverSentElapsedMs: 5000,
    });

    expect(service.getRecommendedSyncIntervalMs()).toBe(5000);
  });

  it("offsetTracker設定をネスト単位で部分指定できること", () => {
    // ネスト単位で省略できる PartialClockSyncConfig を型注釈で明示する
    const config: PartialClockSyncConfig = {
      offsetTracker: { maxSlewPerSampleMs: 5 },
    };
    const service = new ClockSyncService(config, createFixedNowProvider(1000));

    applyConsistentPongs({ service, oneWayDelayMs: 100, sampleCount: 1 });
    applyConsistentPongs({
      service,
      oneWayDelayMs: 20,
      sampleCount: 1,
      trueOffsetMs: TRUE_OFFSET_MS + 500,
      startClientTimeMs: 20000,
    });

    expect(service.getClockOffsetMs()).toBeCloseTo(TRUE_OFFSET_MS + 5, 6);
  });

  it("offsetTracker設定の未指定項目には既定値を使うこと", () => {
    const service = new ClockSyncService(
      { offsetTracker: { maxSlewPerSampleMs: 5 } },
      createFixedNowProvider(1000),
    );

    service.updateFromPong({
      clientTime: 900,
      serverReceivedElapsedMs: 5000,
      serverSentElapsedMs: 5000,
    });
    service.updateFromPong({
      clientTime: 800,
      serverReceivedElapsedMs: 5000,
      serverSentElapsedMs: 5000,
    });

    // 既定のRTT係数0.25でRTT100msと200msが平滑化される
    expect(service.getRecommendedSyncIntervalMs()).toBe(3000);
  });

  it("設定を省略した場合は既定の推奨間隔を返すこと", () => {
    const service = new ClockSyncService(
      undefined,
      createFixedNowProvider(1000),
    );

    expect(service.getRecommendedSyncIntervalMs()).toBe(3000);
  });

  it("時刻取得関数を省略した場合は単調時計を使うこと", () => {
    const nowSpy = vi.spyOn(performance, "now").mockReturnValue(1000);
    const service = new ClockSyncService();

    service.seedFromServerElapsed(5000);
    const elapsedMs = service.getElapsedMs();
    nowSpy.mockRestore();

    expect(elapsedMs).toBe(5000);
  });
});
