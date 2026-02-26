/**
 * GameInputManager
 * ゲーム側へ入力を集約して橋渡しする
 */
/** ジョイスティック入力をゲーム管理へ橋渡しするマネージャー */
export class GameInputManager {
  private onJoystickInput: (x: number, y: number) => void;
  private onPlaceBomb: () => boolean;

  constructor(
    onJoystickInput: (x: number, y: number) => void,
    onPlaceBomb: () => boolean,
  ) {
    this.onJoystickInput = onJoystickInput;
    this.onPlaceBomb = onPlaceBomb;
  }

  public handleJoystickInput = (x: number, y: number) => {
    this.onJoystickInput(x, y);
  };

  public handlePlaceBomb = (): boolean => {
    return this.onPlaceBomb();
  };
}
