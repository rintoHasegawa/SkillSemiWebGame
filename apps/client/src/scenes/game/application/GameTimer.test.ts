/**
 * GameTimer.test
 * 符号付きゲーム経過msから残り時間とカウントダウンを算出する仕様を検証する
 * 開始前・開始直後・終了後の境界と時計未同期時の扱いを検証する
 */
import { describe, expect, it } from "vitest";

import { config } from "@client/config";
import { GameTimer } from "./GameTimer";

const GAME_DURATION_SEC = config.GAME_CONFIG.GAME_DURATION_SEC;

/** 可変の符号付き経過msを供給するタイマーを生成する */
const createTimer = (initialSignedElapsedMs: number | null) => {
  const state: { signedElapsedMs: number | null } = {
    signedElapsedMs: initialSignedElapsedMs,
  };
  const timer = new GameTimer(() => state.signedElapsedMs);

  return { timer, state };
};

describe("GameTimer", () => {
  it("時計未同期では未開始と判定すること", () => {
    const { timer } = createTimer(null);

    expect(timer.isStarted()).toBe(false);
  });

  it("カウントダウン中は未開始と判定すること", () => {
    const { timer } = createTimer(-1);

    expect(timer.isStarted()).toBe(false);
  });

  it("経過0msちょうどは開始済みと判定すること", () => {
    const { timer } = createTimer(0);

    expect(timer.isStarted()).toBe(true);
  });

  it("経過が正値なら開始済みと判定すること", () => {
    const { timer } = createTimer(1500);

    expect(timer.isStarted()).toBe(true);
  });

  it("時計未同期では開始前残り秒を0とすること", () => {
    const { timer } = createTimer(null);

    expect(timer.getPreStartRemainingSec()).toBe(0);
  });

  it("開始前残り秒を切り上げて返すこと", () => {
    const { timer } = createTimer(-1100);

    expect(timer.getPreStartRemainingSec()).toBe(2);
  });

  it("開始前残り秒がちょうど秒単位なら切り上げないこと", () => {
    const { timer } = createTimer(-2000);

    expect(timer.getPreStartRemainingSec()).toBe(2);
  });

  it("開始済みの場合は開始前残り秒を0とすること", () => {
    const { timer } = createTimer(0);

    expect(timer.getPreStartRemainingSec()).toBe(0);
  });

  it("時計未同期では残り時間を制限時間そのものとすること", () => {
    const { timer } = createTimer(null);

    expect(timer.getRemainingTime()).toBe(GAME_DURATION_SEC);
  });

  it("カウントダウン中は残り時間を制限時間そのものとすること", () => {
    const { timer } = createTimer(-1000);

    expect(timer.getRemainingTime()).toBe(GAME_DURATION_SEC);
  });

  it("経過分を差し引いた残り時間を返すこと", () => {
    const { timer } = createTimer(1500);

    expect(timer.getRemainingTime()).toBe(GAME_DURATION_SEC - 1.5);
  });

  it("制限時間ちょうどでは残り時間を0とすること", () => {
    const { timer } = createTimer(GAME_DURATION_SEC * 1000);

    expect(timer.getRemainingTime()).toBe(0);
  });

  it("制限時間を超過した場合は残り時間を0とすること", () => {
    const { timer } = createTimer(GAME_DURATION_SEC * 1000 + 1);

    expect(timer.getRemainingTime()).toBe(0);
  });

  it("時計未同期では経過ミリ秒を0とすること", () => {
    const { timer } = createTimer(null);

    expect(timer.getElapsedMs()).toBe(0);
  });

  it("開始後の経過ミリ秒をそのまま返すこと", () => {
    const { timer } = createTimer(1500);

    expect(timer.getElapsedMs()).toBe(1500);
  });

  it("カウントダウン中の経過ミリ秒は0で下限クランプすること", () => {
    const { timer } = createTimer(-1000);

    expect(timer.getElapsedMs()).toBe(0);
  });

  it("経過の進行に追従して経過ミリ秒が増えること", () => {
    const { timer, state } = createTimer(0);
    state.signedElapsedMs = 3000;

    expect(timer.getElapsedMs()).toBe(3000);
  });

  it("カウントダウンから開始済みへ遷移すると開始済みと判定すること", () => {
    const { timer, state } = createTimer(-500);
    state.signedElapsedMs = 0;

    expect(timer.isStarted()).toBe(true);
  });

  it("時計同期後に経過が確定すると残り時間へ反映されること", () => {
    const { timer, state } = createTimer(null);
    state.signedElapsedMs = 2000;

    expect(timer.getRemainingTime()).toBe(GAME_DURATION_SEC - 2);
  });

  it("provider省略時は時計未同期として扱うこと", () => {
    const timer = new GameTimer();

    expect(timer.isStarted()).toBe(false);
  });

  it("provider省略時の経過ミリ秒は0であること", () => {
    const timer = new GameTimer();

    expect(timer.getElapsedMs()).toBe(0);
  });

  it("provider省略時の残り時間は制限時間そのものであること", () => {
    const timer = new GameTimer();

    expect(timer.getRemainingTime()).toBe(GAME_DURATION_SEC);
  });
});
