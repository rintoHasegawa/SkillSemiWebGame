/**
 * CameraStep
 * ゲームループのカメラ段を担う
 * ローカルプレイヤー位置に応じてワールド座標を更新する
 */
import { Application, Container } from "pixi.js";
import { LocalPlayerController } from "../../entities/player/PlayerController";

type CameraStepParams = {
  app: Application;
  worldContainer: Container;
  me: LocalPlayerController;
};

/** カメラ追従更新を担うステップ */
export class CameraStep {
  public run({ app, worldContainer, me }: CameraStepParams) {
    const meDisplay = me.getDisplayObject();
    worldContainer.position.set(-(meDisplay.x - app.screen.width / 2), -(meDisplay.y - app.screen.height / 2));
  }
}