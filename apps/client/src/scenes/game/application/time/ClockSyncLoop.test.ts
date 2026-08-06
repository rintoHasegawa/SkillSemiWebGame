/**
 * ClockSyncLoop.test
 * 時刻同期PING送信ループの現行挙動を固定する characterization test
 * 即時送信・可変間隔の再スケジュール・停止処理を検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClockSyncLoop } from "./ClockSyncLoop";

/** 送信記録付きのループを生成する */
const createLoop = (options: {
  intervalsMs: number[];
  nowMsProvider?: () => number;
}) => {
  const sentClientTimes: number[] = [];
  let intervalIndex = 0;

  const loop = new ClockSyncLoop({
    sendPing: (clientTime) => {
      sentClientTimes.push(clientTime);
    },
    getNextIntervalMs: () => {
      const intervalMs = options.intervalsMs[
        Math.min(intervalIndex, options.intervalsMs.length - 1)
      ];
      intervalIndex += 1;
      return intervalMs;
    },
    nowMsProvider: options.nowMsProvider,
  });

  return { loop, sentClientTimes };
};

describe("ClockSyncLoop", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("開始前は動作中でないこと", () => {
    const { loop } = createLoop({ intervalsMs: [1000] });

    expect(loop.isRunning()).toBe(false);
  });

  it("開始時に即座にPINGを1回送信すること", () => {
    const { loop, sentClientTimes } = createLoop({
      intervalsMs: [1000],
      nowMsProvider: () => 500,
    });

    loop.start();

    expect(sentClientTimes).toEqual([500]);
  });

  it("開始後は動作中になること", () => {
    const { loop } = createLoop({ intervalsMs: [1000] });

    loop.start();

    expect(loop.isRunning()).toBe(true);
  });

  it("送信時刻に時刻取得関数の値を渡すこと", () => {
    let nowMs = 100;
    const { loop, sentClientTimes } = createLoop({
      intervalsMs: [1000],
      nowMsProvider: () => nowMs,
    });

    loop.start();
    nowMs = 700;
    vi.advanceTimersByTime(1000);

    expect(sentClientTimes).toEqual([100, 700]);
  });

  it("間隔経過前は追加送信しないこと", () => {
    const { loop, sentClientTimes } = createLoop({ intervalsMs: [1000] });

    loop.start();
    vi.advanceTimersByTime(999);

    expect(sentClientTimes).toHaveLength(1);
  });

  it("間隔経過ごとに送信を繰り返すこと", () => {
    const { loop, sentClientTimes } = createLoop({ intervalsMs: [1000] });

    loop.start();
    vi.advanceTimersByTime(3000);

    expect(sentClientTimes).toHaveLength(4);
  });

  it("送信ごとに次回間隔を再取得すること", () => {
    const { loop, sentClientTimes } = createLoop({
      intervalsMs: [1000, 2000, 5000],
    });

    loop.start();
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(2000);

    expect(sentClientTimes).toHaveLength(3);
  });

  it("再取得した間隔より前には送信しないこと", () => {
    const { loop, sentClientTimes } = createLoop({
      intervalsMs: [1000, 5000],
    });

    loop.start();
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(4999);

    expect(sentClientTimes).toHaveLength(2);
  });

  it("停止後は送信しないこと", () => {
    const { loop, sentClientTimes } = createLoop({ intervalsMs: [1000] });

    loop.start();
    loop.stop();
    vi.advanceTimersByTime(10000);

    expect(sentClientTimes).toHaveLength(1);
  });

  it("停止後は動作中でなくなること", () => {
    const { loop } = createLoop({ intervalsMs: [1000] });

    loop.start();
    loop.stop();

    expect(loop.isRunning()).toBe(false);
  });

  it("開始前の停止は何も起こさないこと", () => {
    const { loop, sentClientTimes } = createLoop({ intervalsMs: [1000] });

    loop.stop();

    expect(sentClientTimes).toEqual([]);
  });

  it("再開始しても送信タイマーは1本のみになること", () => {
    const { loop, sentClientTimes } = createLoop({ intervalsMs: [1000] });

    loop.start();
    loop.start();
    vi.advanceTimersByTime(1000);

    expect(sentClientTimes).toHaveLength(3);
  });

  it("disposeで送信を停止すること", () => {
    const { loop, sentClientTimes } = createLoop({ intervalsMs: [1000] });

    loop.start();
    loop.dispose();
    vi.advanceTimersByTime(10000);

    expect(sentClientTimes).toHaveLength(1);
  });

  it("dispose後は動作中でなくなること", () => {
    const { loop } = createLoop({ intervalsMs: [1000] });

    loop.start();
    loop.dispose();

    expect(loop.isRunning()).toBe(false);
  });

  it("時刻取得関数を省略した場合はDate.nowを使うこと", () => {
    vi.spyOn(Date, "now").mockReturnValue(4242);
    const { loop, sentClientTimes } = createLoop({ intervalsMs: [1000] });

    loop.start();

    expect(sentClientTimes).toEqual([4242]);
  });
});
