/**
 * GameInputManager
 * ゲーム側へ入力を集約して橋渡しする
 */
import { GameManager } from "./GameManager";

/** ジョイスティック入力をゲーム管理へ橋渡しするマネージャー */
export class GameInputManager {
  private gameManager: GameManager;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
  }

  public handleJoystickInput = (x: number, y: number) => {
    this.gameManager.setJoystickInput(x, y);
  };
}
