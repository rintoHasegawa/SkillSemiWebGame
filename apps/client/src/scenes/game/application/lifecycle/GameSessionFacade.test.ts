/**
 * GameSessionFacade.test
 * 符号付き経過msを起点にした進行状態と入力可否の仲介を検証する
 * 時計未同期・カウントダウン中・終了後の入力ゲートを検証する
 */
import { describe, expect, it } from "vitest";

import { config } from "@client/config";
import { GameSessionFacade } from "./GameSessionFacade";

const GAME_DURATION_SEC = config.GAME_CONFIG.GAME_DURATION_SEC;

/** 可変の符号付き経過msを供給するファサードを生成する */
const createFacade = (initialSignedElapsedMs: number | null) => {
  const state: { signedElapsedMs: number | null } = {
    signedElapsedMs: initialSignedElapsedMs,
  };
  const facade = new GameSessionFacade({
    signedElapsedMsProvider: () => state.signedElapsedMs,
  });

  return { facade, state };
};

describe("GameSessionFacade", () => {
  it("カウントダウン中は開始前残り秒を返すこと", () => {
    const { facade } = createFacade(-2500);

    expect(facade.getStartCountdownSec()).toBe(3);
  });

  it("時計未同期では開始前残り秒を0とすること", () => {
    const { facade } = createFacade(null);

    expect(facade.getStartCountdownSec()).toBe(0);
  });

  it("経過分を差し引いた残り時間を返すこと", () => {
    const { facade } = createFacade(2000);

    expect(facade.getRemainingTime()).toBe(GAME_DURATION_SEC - 2);
  });

  it("時計未同期では経過ミリ秒を0とすること", () => {
    const { facade } = createFacade(null);

    expect(facade.getElapsedMs()).toBe(0);
  });

  it("時計未同期ではUI操作を受け付けるが反映はしないこと", () => {
    const { facade } = createFacade(null);

    expect(facade.canAcceptInput()).toBe(true);
    expect(facade.canApplyInput()).toBe(false);
  });

  it("カウントダウン中はUI操作を受け付けるが反映はしないこと", () => {
    const { facade } = createFacade(-1);

    expect(facade.canAcceptInput()).toBe(true);
    expect(facade.canApplyInput()).toBe(false);
  });

  it("ゲーム開始後は入力を受け付けること", () => {
    const { facade } = createFacade(0);

    expect(facade.canAcceptInput()).toBe(true);
  });

  it("経過msが0の時点から入力を反映すること", () => {
    const { facade } = createFacade(0);

    expect(facade.canApplyInput()).toBe(true);
  });

  it("制限時間を過ぎたら入力を受け付けないこと", () => {
    const { facade } = createFacade(GAME_DURATION_SEC * 1000);

    expect(facade.canAcceptInput()).toBe(false);
  });

  it("制限時間を過ぎたら入力を反映しないこと", () => {
    const { facade } = createFacade(GAME_DURATION_SEC * 1000);

    expect(facade.canApplyInput()).toBe(false);
  });

  it("入力ロック中は入力を受け付けないこと", () => {
    const { facade } = createFacade(1000);

    facade.lockInput();

    expect(facade.canAcceptInput()).toBe(false);
  });

  it("入力ロック中は入力を反映しないこと", () => {
    const { facade } = createFacade(1000);

    facade.lockInput();

    expect(facade.canApplyInput()).toBe(false);
  });

  it("カウントダウン中の入力ロックではUI操作も受け付けないこと", () => {
    const { facade } = createFacade(-1000);

    facade.lockInput();

    expect(facade.canAcceptInput()).toBe(false);
  });

  it("ロック解除後は入力を受け付けること", () => {
    const { facade } = createFacade(1000);

    const release = facade.lockInput();
    release();

    expect(facade.canAcceptInput()).toBe(true);
  });

  it("入力を反映しない間はジョイスティック入力を0へ丸めること", () => {
    const { facade } = createFacade(-1000);

    expect(facade.sanitizeJoystickInput({ x: 1, y: -1 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("入力を反映する間はジョイスティック入力をそのまま返すこと", () => {
    const { facade } = createFacade(1000);

    expect(facade.sanitizeJoystickInput({ x: 1, y: -1 })).toEqual({
      x: 1,
      y: -1,
    });
  });

  it("カウントダウンから開始へ遷移すると入力反映可否が切り替わること", () => {
    const { facade, state } = createFacade(-500);
    state.signedElapsedMs = 10;

    expect(facade.canApplyInput()).toBe(true);
  });

  it("resetで入力ロックを解除すること", () => {
    const { facade } = createFacade(1000);

    facade.lockInput();
    facade.reset();

    expect(facade.canAcceptInput()).toBe(true);
  });

  it("providerを省略した場合は時計未同期として扱うこと", () => {
    const facade = new GameSessionFacade();

    expect(facade.canApplyInput()).toBe(false);
  });
});
