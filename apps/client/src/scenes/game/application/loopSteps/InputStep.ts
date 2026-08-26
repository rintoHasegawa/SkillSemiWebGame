/**
 * InputStep
 * ゲームループの入力段を担う
 * 反映可否を満たすときのみジョイスティック入力をローカルプレイヤーへ適用する
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
  /** 入力をゲーム進行へ反映してよいかを返す関数 */
  canApplyInput: () => boolean;
};

type InputStepParams = {
  me: LocalPlayerController;
  deltaSeconds: number;
};

/** 入力段の更新処理を担うステップ */
export class InputStep implements LoopStep {
  private readonly getJoystickInput: () => { x: number; y: number };
  private readonly canApplyInput: () => boolean;

  constructor({ getJoystickInput, canApplyInput }: InputStepOptions) {
    this.getJoystickInput = getJoystickInput;
    this.canApplyInput = canApplyInput;
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
    // 開始前カウントダウン中は保持中の入力を破棄せず，移動への反映のみ止める
    if (!this.canApplyInput()) {
      return {
        isMoving: false,
        axisX: 0,
        axisY: 0,
      };
    }

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