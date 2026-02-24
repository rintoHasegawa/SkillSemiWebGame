/**
 * InputStep
 * ゲームループの入力段を担う
 * ジョイスティック入力をローカルプレイヤーへ適用する
 */
import { LocalPlayerController } from "@client/scenes/game/entities/player/PlayerController";

type InputStepOptions = {
  getJoystickInput: () => { x: number; y: number };
};

type InputStepParams = {
  me: LocalPlayerController;
  deltaSeconds: number;
};

type InputStepResult = {
  isMoving: boolean;
};

/** 入力段の更新処理を担うステップ */
export class InputStep {
  private getJoystickInput: () => { x: number; y: number };

  constructor({ getJoystickInput }: InputStepOptions) {
    this.getJoystickInput = getJoystickInput;
  }

  public run({ me, deltaSeconds }: InputStepParams): InputStepResult {
    const { x: axisX, y: axisY } = this.getJoystickInput();
    const isMoving = axisX !== 0 || axisY !== 0;

    if (isMoving) {
      me.applyLocalInput({ axisX, axisY, deltaTime: deltaSeconds });
    }

    return { isMoving };
  }
}