/**
 * GameLoop
 * 毎フレームの入力，シミュレーション，カメラ更新を進行する
 * 各 Step を呼び出して更新順序を統制する
 */
import { Application, Container, Ticker } from "pixi.js";
import { config } from "@client/config";
import { LocalPlayerController } from "@client/scenes/game/entities/player/PlayerController";
import { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";
import { BombManager } from "@client/scenes/game/entities/bomb/BombManager";
import type { GamePlayers } from "./game.types";
import { InputStep } from "./loopSteps/InputStep";
import { SimulationStep } from "./loopSteps/SimulationStep";
import { CameraStep } from "./loopSteps/CameraStep";
import { BombStep } from "./loopSteps/BombStep";
import type { LoopFrameContext, LoopStep } from "./loopSteps/LoopStep";
import { resolveFrameDelta } from "./loopSteps/frameDelta";
import type { MoveSender } from "./network/PlayerMoveSender";

type GameLoopOptions = {
  app: Application;
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  getJoystickInput: () => { x: number; y: number };
  bombManager: BombManager;
  moveSender: MoveSender;
};

/** ゲームのフレーム更新順序を管理するループ制御クラス */
export class GameLoop {
  private app: Application;
  private worldContainer: Container;
  private playerRepository: PlayerRepository;
  private myId: string;
  private inputStep: InputStep;
  private simulationStep: SimulationStep;
  private bombStep: BombStep;
  private cameraStep: CameraStep;
  private steps: LoopStep[];

  constructor({ app, worldContainer, players, myId, getJoystickInput, bombManager, moveSender }: GameLoopOptions) {
    this.app = app;
    this.worldContainer = worldContainer;
    this.playerRepository = new PlayerRepository(players);
    this.myId = myId;
    this.inputStep = new InputStep({ getJoystickInput });
    this.simulationStep = new SimulationStep({
      moveSender,
    });
    this.bombStep = new BombStep({ bombManager });
    this.cameraStep = new CameraStep();
    this.steps = [
      this.inputStep,
      this.simulationStep,
      this.bombStep,
      this.cameraStep,
    ];
  }

  public tick = (ticker: Ticker) => {
    const me = this.playerRepository.getById(this.myId);
    if (!me || !(me instanceof LocalPlayerController)) return;

    const { deltaSeconds } = resolveFrameDelta(
      ticker,
      config.GAME_CONFIG.FRAME_DELTA_MAX_MS,
    );
    const frameContext: LoopFrameContext = {
      app: this.app,
      worldContainer: this.worldContainer,
      playerRepository: this.playerRepository,
      me,
      deltaSeconds,
      isMoving: false,
    };

    this.steps.forEach((step) => {
      step.run(frameContext);
    });
  };
}
