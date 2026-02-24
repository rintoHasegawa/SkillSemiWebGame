import { LocalPlayerController } from "../../entities/player/PlayerController";

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