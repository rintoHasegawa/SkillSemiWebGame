/**
 * GameClock.test
 * サーバー唯一のゲーム時間軸の挙動を検証するユニットテスト
 * 未開始・カウントダウン中・ゲームプレイ開始境界の各状態と，
 * 開始待機時間の丸め（非有限・負値）を検証する
 */
import { describe, expect, it } from "vitest";

import { GameClock } from "./GameClock";

const START_DELAY_MS = 5_000;

/** 任意に進められる単調時計スタブを生成する */
const createNowProviderStub = (initialMs: number = 1_000) => {
  let currentMs = initialMs;

  return {
    now: () => currentMs,
    /** 単調時計を指定ms進める */
    advance: (deltaMs: number) => {
      currentMs += deltaMs;
    },
    /** 単調時計を任意の値へ設定する（巻き戻しの再現に使う） */
    set: (valueMs: number) => {
      currentMs = valueMs;
    },
  };
};

describe("GameClock 未開始時", () => {
  it("原点未確定なら生の経過msは0を返すこと", () => {
    const clock = new GameClock(START_DELAY_MS, () => 999_999);

    expect(clock.getRawElapsedMs()).toBe(0);
  });

  it("原点未確定ならゲーム経過msは0を返すこと", () => {
    const clock = new GameClock(START_DELAY_MS, () => 999_999);

    expect(clock.getElapsedMs()).toBe(0);
  });

  it("原点未確定なら符号付き経過msは開始待機時間の負値を返すこと", () => {
    const clock = new GameClock(START_DELAY_MS, () => 999_999);

    expect(clock.getSignedElapsedMs()).toBe(-START_DELAY_MS);
  });

  it("原点未確定ならゲームプレイ開始済みと判定しないこと", () => {
    const clock = new GameClock(START_DELAY_MS, () => 999_999);

    expect(clock.hasGameplayStarted()).toBe(false);
  });

  it("開始待機時間0でも原点未確定ならゲームプレイ開始済みと判定しないこと", () => {
    const clock = new GameClock(0, () => 999_999);

    expect(clock.hasGameplayStarted()).toBe(false);
  });
});

describe("GameClock.start", () => {
  it("start時点の単調時計値を原点に確定すること", () => {
    const nowProvider = createNowProviderStub(10_000);
    const clock = new GameClock(START_DELAY_MS, nowProvider.now);

    clock.start();
    nowProvider.advance(1_500);

    expect(clock.getRawElapsedMs()).toBe(1_500);
  });

  it("2回目以降のstartは原点を更新しないこと", () => {
    const nowProvider = createNowProviderStub(10_000);
    const clock = new GameClock(START_DELAY_MS, nowProvider.now);

    clock.start();
    nowProvider.advance(1_500);
    clock.start();

    expect(clock.getRawElapsedMs()).toBe(1_500);
  });

  it("原点が0でも開始済みとして扱うこと", () => {
    const nowProvider = createNowProviderStub(0);
    const clock = new GameClock(0, nowProvider.now);

    clock.start();

    expect(clock.hasGameplayStarted()).toBe(true);
  });

  it("単調時計が巻き戻っても生の経過msを負にしないこと", () => {
    const nowProvider = createNowProviderStub(10_000);
    const clock = new GameClock(START_DELAY_MS, nowProvider.now);

    clock.start();
    nowProvider.set(9_000);

    expect(clock.getRawElapsedMs()).toBe(0);
  });
});

describe("GameClock カウントダウン中", () => {
  it("開始待機時間の1ms手前ではゲーム経過msを0に丸めること", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(START_DELAY_MS, nowProvider.now);
    clock.start();

    nowProvider.advance(START_DELAY_MS - 1);

    expect(clock.getElapsedMs()).toBe(0);
  });

  it("開始待機時間の1ms手前では符号付き経過msを負で返すこと", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(START_DELAY_MS, nowProvider.now);
    clock.start();

    nowProvider.advance(START_DELAY_MS - 1);

    expect(clock.getSignedElapsedMs()).toBe(-1);
  });

  it("開始待機時間の1ms手前ではゲームプレイ開始済みと判定しないこと", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(START_DELAY_MS, nowProvider.now);
    clock.start();

    nowProvider.advance(START_DELAY_MS - 1);

    expect(clock.hasGameplayStarted()).toBe(false);
  });

  it("start直後は符号付き経過msが開始待機時間の負値になること", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(START_DELAY_MS, nowProvider.now);

    clock.start();

    expect(clock.getSignedElapsedMs()).toBe(-START_DELAY_MS);
  });
});

describe("GameClock ゲームプレイ開始境界", () => {
  it("開始待機時間ちょうどでゲームプレイ開始済みと判定すること", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(START_DELAY_MS, nowProvider.now);
    clock.start();

    nowProvider.advance(START_DELAY_MS);

    expect(clock.hasGameplayStarted()).toBe(true);
  });

  it("開始待機時間ちょうどでゲーム経過msが0になること", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(START_DELAY_MS, nowProvider.now);
    clock.start();

    nowProvider.advance(START_DELAY_MS);

    expect(clock.getElapsedMs()).toBe(0);
  });

  it("開始待機時間ちょうどで符号付き経過msが0になること", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(START_DELAY_MS, nowProvider.now);
    clock.start();

    nowProvider.advance(START_DELAY_MS);

    expect(clock.getSignedElapsedMs()).toBe(0);
  });

  it("開始待機時間を超えた分だけゲーム経過msが進むこと", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(START_DELAY_MS, nowProvider.now);
    clock.start();

    nowProvider.advance(START_DELAY_MS + 1_234);

    expect(clock.getElapsedMs()).toBe(1_234);
  });

  it("ゲームプレイ開始後も生の経過msは開始待機ぶんを含むこと", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(START_DELAY_MS, nowProvider.now);
    clock.start();

    nowProvider.advance(START_DELAY_MS + 1_234);

    expect(clock.getRawElapsedMs()).toBe(START_DELAY_MS + 1_234);
  });
});

describe("GameClock 開始待機時間の丸め", () => {
  it("負の開始待機時間は0として扱うこと", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(-1_000, nowProvider.now);
    clock.start();

    expect(clock.getSignedElapsedMs()).toBe(0);
  });

  it("負の開始待機時間ではstart直後からゲームプレイ開始済みとすること", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(-1_000, nowProvider.now);

    clock.start();

    expect(clock.hasGameplayStarted()).toBe(true);
  });

  it("NaNの開始待機時間は0として扱うこと", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(Number.NaN, nowProvider.now);
    clock.start();

    nowProvider.advance(100);

    expect(clock.getSignedElapsedMs()).toBe(100);
  });

  it("Infinityの開始待機時間は0として扱うこと", () => {
    const nowProvider = createNowProviderStub();
    const clock = new GameClock(Number.POSITIVE_INFINITY, nowProvider.now);
    clock.start();

    nowProvider.advance(100);

    expect(clock.getElapsedMs()).toBe(100);
  });
});
