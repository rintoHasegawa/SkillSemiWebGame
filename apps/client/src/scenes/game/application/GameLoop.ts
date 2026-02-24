import { Application, Container, Ticker } from "pixi.js";
import { LocalPlayerController } from "../entities/player/PlayerController";
import type { GamePlayers } from "./game.types";
import { InputStep } from "./loopSteps/InputStep";
import { SimulationStep } from "./loopSteps/SimulationStep";
import { CameraStep } from "./loopSteps/CameraStep";

type GameLoopOptions = {
  app: Application;
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  getJoystickInput: () => { x: number; y: number };
};

export class GameLoop {
  private app: Application;
  private worldContainer: Container;
  private players: GamePlayers;
  private myId: string;
  private inputStep: InputStep;
  private simulationStep: SimulationStep;
  private cameraStep: CameraStep;

  constructor({ app, worldContainer, players, myId, getJoystickInput }: GameLoopOptions) {
    this.app = app;
    this.worldContainer = worldContainer;
    this.players = players;
    this.myId = myId;
    this.inputStep = new InputStep({ getJoystickInput });
    this.simulationStep = new SimulationStep();
    this.cameraStep = new CameraStep();
  }

  public tick = (ticker: Ticker) => {
    const me = this.players[this.myId];
    if (!me || !(me instanceof LocalPlayerController)) return;

    const deltaSeconds = ticker.deltaMS / 1000;
    const { isMoving } = this.inputStep.run({ me, deltaSeconds });

    this.simulationStep.run({
      me,
      players: this.players,
      deltaSeconds,
      isMoving,
    });

    this.cameraStep.run({
      app: this.app,
      worldContainer: this.worldContainer,
      me,
    });
  };
}
