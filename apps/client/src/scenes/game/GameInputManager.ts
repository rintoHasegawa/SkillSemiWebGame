/**
 * GameInputManager
 * ゲーム側へ入力を集約して橋渡しする
 */
/** ジョイスティック入力をゲーム管理へ橋渡しするマネージャー */
export class GameInputManager {
  private onJoystickInput: (x: number, y: number) => void;

  constructor(onJoystickInput: (x: number, y: number) => void) {
    this.onJoystickInput = onJoystickInput;
  }

  public handleJoystickInput = (x: number, y: number) => {
    this.onJoystickInput(x, y);
  };
}
