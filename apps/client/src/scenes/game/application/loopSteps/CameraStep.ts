import { Application, Container } from "pixi.js";
import { LocalPlayerController } from "../../entities/player/PlayerController";

type CameraStepParams = {
  app: Application;
  worldContainer: Container;
  me: LocalPlayerController;
};

export class CameraStep {
  public run({ app, worldContainer, me }: CameraStepParams) {
    const meDisplay = me.getDisplayObject();
    worldContainer.position.set(-(meDisplay.x - app.screen.width / 2), -(meDisplay.y - app.screen.height / 2));
  }
}