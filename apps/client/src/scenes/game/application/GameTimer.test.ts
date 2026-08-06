/**
 * GameTimer.test
 * 残り時間計算の現行挙動を固定する characterization test
 * 開始前・開始直後・終了後の境界と未設定時の扱いを検証する
 */
import { describe, expect, it, vi } from "vitest";

import { config } from "@client/config";
import { GameTimer } from "./GameTimer";

const GAME_DURATION_SEC = config.GAME_CONFIG.GAME_DURATION_SEC;

/** 可変の現在時刻を持つタイマーを生成する */
const createTimer = (initialNowMs: number) => {
  const state = { nowMs: initialNowMs };
  const timer = new GameTimer(() => state.nowMs);

  return { timer, state };
};

describe("GameTimer", () => {
  it("開始時刻未設定では開始時刻がnullであること", () => {
    const { timer } = createTimer(1000);

    expect(timer.getStartTime()).toBeNull();
  });

  it("開始時刻を設定すると設定値を返すこと", () => {
    const { timer } = createTimer(1000);

    timer.setGameStart(5000);

    expect(timer.getStartTime()).toBe(5000);
  });

  it("開始時刻未設定では未開始と判定すること", () => {
    const { timer } = createTimer(1000);

    expect(timer.isStarted()).toBe(false);
  });

  it("開始時刻前は未開始と判定すること", () => {
    const { timer } = createTimer(4999);
    timer.setGameStart(5000);

    expect(timer.isStarted()).toBe(false);
  });

  it("開始時刻ちょうどは開始済みと判定すること", () => {
    const { timer } = createTimer(5000);
    timer.setGameStart(5000);

    expect(timer.isStarted()).toBe(true);
  });

  it("開始時刻に0を設定した場合は未開始と判定すること", () => {
    const { timer } = createTimer(1000);
    timer.setGameStart(0);

    expect(timer.isStarted()).toBe(false);
  });

  it("開始時刻未設定では開始前残り秒を0とすること", () => {
    const { timer } = createTimer(1000);

    expect(timer.getPreStartRemainingSec()).toBe(0);
  });

  it("開始前残り秒を切り上げて返すこと", () => {
    const { timer } = createTimer(3900);
    timer.setGameStart(5000);

    expect(timer.getPreStartRemainingSec()).toBe(2);
  });

  it("開始時刻を過ぎている場合は開始前残り秒を0とすること", () => {
    const { timer } = createTimer(5000);
    timer.setGameStart(5000);

    expect(timer.getPreStartRemainingSec()).toBe(0);
  });

  it("開始時刻未設定では残り時間を制限時間そのものとすること", () => {
    const { timer } = createTimer(1000);

    expect(timer.getRemainingTime()).toBe(GAME_DURATION_SEC);
  });

  it("開始前は残り時間を制限時間そのものとすること", () => {
    const { timer } = createTimer(4000);
    timer.setGameStart(5000);

    expect(timer.getRemainingTime()).toBe(GAME_DURATION_SEC);
  });

  it("経過分を差し引いた残り時間を返すこと", () => {
    const { timer } = createTimer(6500);
    timer.setGameStart(5000);

    expect(timer.getRemainingTime()).toBe(GAME_DURATION_SEC - 1.5);
  });

  it("制限時間を超過した場合は残り時間を0とすること", () => {
    const { timer } = createTimer(5000 + GAME_DURATION_SEC * 1000 + 1);
    timer.setGameStart(5000);

    expect(timer.getRemainingTime()).toBe(0);
  });

  it("開始時刻未設定では経過ミリ秒を0とすること", () => {
    const { timer } = createTimer(1000);

    expect(timer.getElapsedMs()).toBe(0);
  });

  it("開始後の経過ミリ秒を返すこと", () => {
    const { timer } = createTimer(6500);
    timer.setGameStart(5000);

    expect(timer.getElapsedMs()).toBe(1500);
  });

  it("開始前の経過ミリ秒は0で下限クランプすること", () => {
    const { timer } = createTimer(4000);
    timer.setGameStart(5000);

    expect(timer.getElapsedMs()).toBe(0);
  });

  it("開始時刻を再設定した場合は新しい基準で経過を計算すること", () => {
    const { timer } = createTimer(6500);
    timer.setGameStart(5000);
    timer.setGameStart(6000);

    expect(timer.getElapsedMs()).toBe(500);
  });

  it("現在時刻の進行に追従して経過ミリ秒が増えること", () => {
    const { timer, state } = createTimer(5000);
    timer.setGameStart(5000);
    state.nowMs = 8000;

    expect(timer.getElapsedMs()).toBe(3000);
  });

  it("時刻取得関数を省略した場合はDate.nowを使うこと", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(7000);
    const timer = new GameTimer();

    timer.setGameStart(5000);
    const elapsedMs = timer.getElapsedMs();
    nowSpy.mockRestore();

    expect(elapsedMs).toBe(2000);
  });
});
