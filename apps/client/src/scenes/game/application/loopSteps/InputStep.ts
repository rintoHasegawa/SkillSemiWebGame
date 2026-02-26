/**
 * InputStep
 * ゲームループの入力段を担う
 * ジョイスティック入力をローカルプレイヤーへ適用する
 */
import { LocalPlayerController } from "@client/scenes/game/entities/player/PlayerController";
import type {
  LoopFrameContext,
  LoopFrameEffects,
  LoopMovementState,
  LoopStep,
} from "./LoopStep";

type InputStepOptions = {
  getJoystickInput: () => { x: number; y: number };
};

type InputStepParams = {
  me: LocalPlayerController;
  deltaSeconds: number;
};

/** 入力段の更新処理を担うステップ */
export class InputStep implements LoopStep {
  private getJoystickInput: () => { x: number; y: number };

  constructor({ getJoystickInput }: InputStepOptions) {
    this.getJoystickInput = getJoystickInput;
  }

  /** 入力文脈を適用して移動状態を更新する */
  public run(
    context: Readonly<LoopFrameContext>,
    effects: LoopFrameEffects,
  ): void {
    const params: InputStepParams = {
      me: context.me,
      deltaSeconds: context.deltaSeconds,
    };

    const movementState = this.applyInput(params);
    effects.setMovementState(movementState);
  }

  private applyInput({ me, deltaSeconds }: InputStepParams): LoopMovementState {
    const { x: axisX, y: axisY } = this.getJoystickInput();
    const isMoving = axisX !== 0 || axisY !== 0;

    if (isMoving) {
      me.applyLocalInput({ axisX, axisY, deltaTime: deltaSeconds });
    }

    return {
      isMoving,
      axisX,
      axisY,
    };
  }
}