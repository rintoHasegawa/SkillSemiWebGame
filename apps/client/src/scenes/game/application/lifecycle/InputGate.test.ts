/**
 * InputGate.test
 * 入力受付可否判定の現行挙動を固定する characterization test
 * ロックの多重取得・二重解放と入力正規化の分岐を検証する
 */
import { describe, expect, it } from "vitest";

import { InputGate } from "./InputGate";

/** 判定条件を差し替え可能なゲートを生成する */
const createGate = (
  initial: { isStarted: boolean; isPlayableTime?: boolean },
) => {
  const state = {
    isStarted: initial.isStarted,
    isPlayableTime: initial.isPlayableTime ?? true,
  };

  const gate = new InputGate({
    isStartedProvider: () => state.isStarted,
    isPlayableTimeProvider: () => state.isPlayableTime,
  });

  return { gate, state };
};

describe("InputGate", () => {
  it("未開始の場合は入力を受け付けないこと", () => {
    const { gate } = createGate({ isStarted: false });

    expect(gate.canAcceptInput()).toBe(false);
  });

  it("開始済みかつプレイ可能時間なら入力を受け付けること", () => {
    const { gate } = createGate({ isStarted: true });

    expect(gate.canAcceptInput()).toBe(true);
  });

  it("プレイ可能時間外の場合は入力を受け付けないこと", () => {
    const { gate } = createGate({ isStarted: true, isPlayableTime: false });

    expect(gate.canAcceptInput()).toBe(false);
  });

  it("プレイ可能時間判定を省略した場合は常に許可扱いとすること", () => {
    const gate = new InputGate({ isStartedProvider: () => true });

    expect(gate.canAcceptInput()).toBe(true);
  });

  it("ロック取得中は入力を受け付けないこと", () => {
    const { gate } = createGate({ isStarted: true });

    gate.lockInput();

    expect(gate.canAcceptInput()).toBe(false);
  });

  it("ロック解放後は入力を受け付けること", () => {
    const { gate } = createGate({ isStarted: true });

    const release = gate.lockInput();
    release();

    expect(gate.canAcceptInput()).toBe(true);
  });

  it("多重ロック時は1つ解放しても入力を受け付けないこと", () => {
    const { gate } = createGate({ isStarted: true });
    const release = gate.lockInput();
    gate.lockInput();

    release();

    expect(gate.canAcceptInput()).toBe(false);
  });

  it("多重ロックをすべて解放すると入力を受け付けること", () => {
    const { gate } = createGate({ isStarted: true });
    const firstRelease = gate.lockInput();
    const secondRelease = gate.lockInput();

    firstRelease();
    secondRelease();

    expect(gate.canAcceptInput()).toBe(true);
  });

  it("同じ解放関数を二重に呼んでもロック数を過剰に減らさないこと", () => {
    const { gate } = createGate({ isStarted: true });
    const firstRelease = gate.lockInput();
    gate.lockInput();

    firstRelease();
    firstRelease();

    expect(gate.canAcceptInput()).toBe(false);
  });

  it("入力受付可能なときはジョイスティック入力をそのまま返すこと", () => {
    const { gate } = createGate({ isStarted: true });

    expect(gate.sanitizeJoystickInput({ x: 0.5, y: -0.5 })).toEqual({
      x: 0.5,
      y: -0.5,
    });
  });

  it("入力受付不可のときはジョイスティック入力を0へ丸めること", () => {
    const { gate } = createGate({ isStarted: false });

    expect(gate.sanitizeJoystickInput({ x: 0.5, y: -0.5 })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("リセットでロック状態を解除すること", () => {
    const { gate } = createGate({ isStarted: true });
    gate.lockInput();
    gate.lockInput();

    gate.reset();

    expect(gate.canAcceptInput()).toBe(true);
  });

  it("リセット後に古い解放関数を呼んでもロック数を負にしないこと", () => {
    const { gate } = createGate({ isStarted: true });
    const release = gate.lockInput();
    gate.reset();

    release();
    gate.lockInput();

    expect(gate.canAcceptInput()).toBe(false);
  });

  it("リセット後に取得した新しいロックを古い解放関数で解除しないこと", () => {
    const { gate } = createGate({ isStarted: true });
    const staleRelease = gate.lockInput();
    gate.reset();
    gate.lockInput();

    staleRelease();

    expect(gate.canAcceptInput()).toBe(false);
  });

  it("リセット後に発行した解放関数はロックを解除できること", () => {
    const { gate } = createGate({ isStarted: true });
    gate.lockInput();
    gate.reset();
    const release = gate.lockInput();

    release();

    expect(gate.canAcceptInput()).toBe(true);
  });

  it("リセットを複数回行っても古い解放関数を無効のままにすること", () => {
    const { gate } = createGate({ isStarted: true });
    const staleRelease = gate.lockInput();
    gate.reset();
    gate.reset();
    gate.lockInput();

    staleRelease();

    expect(gate.canAcceptInput()).toBe(false);
  });
});
