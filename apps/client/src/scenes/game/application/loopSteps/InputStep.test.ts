/**
 * InputStep.test
 * 入力段の反映可否ゲートと保持中入力の扱いを検証する
 * カウントダウン中の入力保持と開始直後の移動再開を保証する
 */
import { describe, expect, it } from "vitest";

import type {
  LocalInput,
  LocalPlayerController,
} from "@client/scenes/game/entities/player/PlayerController";
import { InputStep } from "./InputStep";
import type {
  LoopFrameContext,
  LoopFrameEffects,
  LoopMovementState,
} from "./LoopStep";

const NO_MOVEMENT: LoopMovementState = {
  isMoving: false,
  axisX: 0,
  axisY: 0,
};

type StepEnvironmentOptions = {
  joystickInput: { x: number; y: number };
  canApplyInput: boolean;
  deltaSeconds?: number;
};

/** 反映可否と入力値を差し替え可能な入力段の実行環境を生成する */
const createStepEnvironment = ({
  joystickInput,
  canApplyInput,
  deltaSeconds = 0.5,
}: StepEnvironmentOptions) => {
  const state = { joystickInput, canApplyInput };
  const appliedInputs: LocalInput[] = [];
  const movementStates: LoopMovementState[] = [];

  // InputStep は applyLocalInput のみ使用するため最小スタブを注入する
  const me = {
    applyLocalInput: (input: LocalInput) => {
      appliedInputs.push(input);
    },
  } as unknown as LocalPlayerController;

  const context = {
    me,
    deltaSeconds,
  } as unknown as LoopFrameContext;

  const effects: LoopFrameEffects = {
    setMovementState: (movement) => {
      movementStates.push(movement);
    },
    getMovementState: () => movementStates.at(-1) ?? NO_MOVEMENT,
  };

  const step = new InputStep({
    getJoystickInput: () => state.joystickInput,
    canApplyInput: () => state.canApplyInput,
  });

  return {
    state,
    appliedInputs,
    movementStates,
    run: () => {
      step.run(context, effects);
    },
  };
};

describe("InputStep", () => {
  it("反映不可のときはローカル入力を適用しないこと", () => {
    const { appliedInputs, run } = createStepEnvironment({
      joystickInput: { x: 0.6, y: -0.8 },
      canApplyInput: false,
    });

    run();

    expect(appliedInputs).toEqual([]);
  });

  it("反映不可のときは移動状態を停止として通知すること", () => {
    const { movementStates, run } = createStepEnvironment({
      joystickInput: { x: 0.6, y: -0.8 },
      canApplyInput: false,
    });

    run();

    expect(movementStates).toEqual([
      { isMoving: false, axisX: 0, axisY: 0 },
    ]);
  });

  it("反映不可でも保持中のジョイスティック入力を破棄しないこと", () => {
    const environment = createStepEnvironment({
      joystickInput: { x: 0.6, y: -0.8 },
      canApplyInput: false,
    });

    environment.run();

    expect(environment.state.joystickInput).toEqual({ x: 0.6, y: -0.8 });
  });

  it("反映可へ切り替わると保持中の入力がそのまま適用されること", () => {
    const environment = createStepEnvironment({
      joystickInput: { x: 0.6, y: -0.8 },
      canApplyInput: false,
      deltaSeconds: 0.25,
    });

    environment.run();
    environment.state.canApplyInput = true;
    environment.run();

    expect(environment.appliedInputs).toEqual([
      { axisX: 0.6, axisY: -0.8, deltaTime: 0.25 },
    ]);
  });

  it("反映可へ切り替わった直後は保持中の軸で移動状態を通知すること", () => {
    const environment = createStepEnvironment({
      joystickInput: { x: 0.6, y: -0.8 },
      canApplyInput: false,
    });

    environment.run();
    environment.state.canApplyInput = true;
    environment.run();

    expect(environment.movementStates.at(-1)).toEqual({
      isMoving: true,
      axisX: 0.6,
      axisY: -0.8,
    });
  });

  it("反映可でも入力が0のときはローカル入力を適用しないこと", () => {
    const { appliedInputs, run } = createStepEnvironment({
      joystickInput: { x: 0, y: 0 },
      canApplyInput: true,
    });

    run();

    expect(appliedInputs).toEqual([]);
  });

  it("反映可でも入力が0のときは移動状態を停止として通知すること", () => {
    const { movementStates, run } = createStepEnvironment({
      joystickInput: { x: 0, y: 0 },
      canApplyInput: true,
    });

    run();

    expect(movementStates).toEqual([
      { isMoving: false, axisX: 0, axisY: 0 },
    ]);
  });

  it("反映可で入力があるときはフレーム時間付きで適用すること", () => {
    const { appliedInputs, run } = createStepEnvironment({
      joystickInput: { x: 1, y: 0 },
      canApplyInput: true,
      deltaSeconds: 0.016,
    });

    run();

    expect(appliedInputs).toEqual([
      { axisX: 1, axisY: 0, deltaTime: 0.016 },
    ]);
  });

  it("片方の軸のみ入力がある場合も移動中として扱うこと", () => {
    const { movementStates, run } = createStepEnvironment({
      joystickInput: { x: 0, y: -0.2 },
      canApplyInput: true,
    });

    run();

    expect(movementStates).toEqual([
      { isMoving: true, axisX: 0, axisY: -0.2 },
    ]);
  });

  it("反映可から反映不可へ戻ると移動状態を停止へ更新すること", () => {
    const environment = createStepEnvironment({
      joystickInput: { x: 0.6, y: -0.8 },
      canApplyInput: true,
    });

    environment.run();
    environment.state.canApplyInput = false;
    environment.run();

    expect(environment.movementStates.at(-1)).toEqual({
      isMoving: false,
      axisX: 0,
      axisY: 0,
    });
  });

  it("反映不可の間はフレームを重ねてもローカル入力を適用しないこと", () => {
    const { appliedInputs, run } = createStepEnvironment({
      joystickInput: { x: 0.6, y: -0.8 },
      canApplyInput: false,
    });

    run();
    run();
    run();

    expect(appliedInputs).toEqual([]);
  });
});
