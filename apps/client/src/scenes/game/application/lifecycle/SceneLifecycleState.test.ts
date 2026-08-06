/**
 * SceneLifecycleState.test
 * シーンライフサイクル判定の現行挙動を固定する characterization test
 * 初期化前破棄・初期化後破棄の分岐を検証する
 */
import { describe, expect, it } from "vitest";

import { SceneLifecycleState } from "./SceneLifecycleState";

describe("SceneLifecycleState", () => {
  it("初期状態では初期化を中断しないこと", () => {
    const state = new SceneLifecycleState();

    expect(state.shouldAbortInit()).toBe(false);
  });

  it("初期状態ではPixi破棄を行わないこと", () => {
    const state = new SceneLifecycleState();

    expect(state.shouldDestroyApp()).toBe(false);
  });

  it("破棄要求後は初期化を中断すること", () => {
    const state = new SceneLifecycleState();

    state.markDestroyed();

    expect(state.shouldAbortInit()).toBe(true);
  });

  it("初期化完了後はPixi破棄を行うこと", () => {
    const state = new SceneLifecycleState();

    state.markInitialized();

    expect(state.shouldDestroyApp()).toBe(true);
  });

  it("初期化未完了のまま破棄要求してもPixi破棄は行わないこと", () => {
    const state = new SceneLifecycleState();

    state.markDestroyed();

    expect(state.shouldDestroyApp()).toBe(false);
  });

  it("破棄要求後に初期化完了を記録した場合はPixi破棄を行うこと", () => {
    const state = new SceneLifecycleState();

    state.markDestroyed();
    state.markInitialized();

    expect(state.shouldDestroyApp()).toBe(true);
  });

  it("初期化完了後の破棄要求でも初期化中断判定は真になること", () => {
    const state = new SceneLifecycleState();

    state.markInitialized();
    state.markDestroyed();

    expect(state.shouldAbortInit()).toBe(true);
  });
});
