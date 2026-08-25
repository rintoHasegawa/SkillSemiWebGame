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
import { InputStep } from "./loopSteps/InputStep";
import { SimulationStep } from "./loopSteps/SimulationStep";
import { CameraStep } from "./loopSteps/CameraStep";
import { BombStep } from "./loopSteps/BombStep";
import type {
  LoopFrameContext,
  LoopFrameEffects,
  LoopMovementState,
  LoopStep,
} from "./loopSteps/LoopStep";
import { resolveFrameDelta } from "./loopSteps/frameDelta";
import type { MoveSender } from "./network/PlayerMoveSender";

type GameLoopOptions = {
  app: Application;
  worldContainer: Container;
  playerRepository: PlayerRepository;
  myId: string;
  getJoystickInput: () => { x: number; y: number };
  /** 入力をゲーム進行へ反映してよいかを返す関数 */
  canApplyInput: () => boolean;
  bombManager: BombManager;
  moveSender: MoveSender;
};

/** ゲームのフレーム更新順序を管理するループ制御クラス */
export class GameLoop {
  private readonly app: Application;
  private readonly worldContainer: Container;
  private readonly playerRepository: PlayerRepository;
  private readonly myId: string;
  private readonly inputStep: InputStep;
  private readonly simulationStep: SimulationStep;
  private readonly bombStep: BombStep;
  private readonly cameraStep: CameraStep;
  private readonly steps: LoopStep[];

  constructor({
    app,
    worldContainer,
    playerRepository,
    myId,
    getJoystickInput,
    canApplyInput,
    bombManager,
    moveSender,
  }: GameLoopOptions) {
    this.app = app;
    this.worldContainer = worldContainer;
    this.playerRepository = playerRepository;
    this.myId = myId;
    this.inputStep = new InputStep({ getJoystickInput, canApplyInput });
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
    const frameState: { movement: LoopMovementState } = {
      movement: {
        isMoving: false,
        axisX: 0,
        axisY: 0,
      },
    };

    const frameContext: LoopFrameContext = {
      app: this.app,
      worldContainer: this.worldContainer,
      playerRepository: this.playerRepository,
      me,
      deltaSeconds,
    };

    const effects: LoopFrameEffects = {
      setMovementState: (movement) => {
        frameState.movement = movement;
      },
      getMovementState: () => {
        return frameState.movement;
      },
    };

    this.steps.forEach((step) => {
      step.run(frameContext, effects);
    });
  };
}
