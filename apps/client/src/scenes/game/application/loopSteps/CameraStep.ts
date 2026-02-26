/**
 * CameraStep
 * ゲームループのカメラ段を担う
 * ローカルプレイヤー位置に応じてワールド座標を更新する
 */
import { Application, Container } from "pixi.js";
import { LocalPlayerController } from "@client/scenes/game/entities/player/PlayerController";
import type { LoopFrameContext, LoopStep } from "./LoopStep";

type CameraStepParams = {
  app: Application;
  worldContainer: Container;
  me: LocalPlayerController;
};

/** カメラ追従更新を担うステップ */
export class CameraStep implements LoopStep {
  /** ローカルプレイヤー位置へカメラを追従させる */
  public run(context: LoopFrameContext): void {
    const params: CameraStepParams = {
      app: context.app,
      worldContainer: context.worldContainer,
      me: context.me,
    };

    const { app, worldContainer, me } = params;
    const meDisplay = me.getDisplayObject();
    worldContainer.position.set(-(meDisplay.x - app.screen.width / 2), -(meDisplay.y - app.screen.height / 2));
  }
}