/**
 * SimulationStep
 * ゲームループのシミュレーション段を担う
 * ローカル更新とリモート補間更新を順に実行する
 */
import { config } from "@client/config";
import { LocalPlayerController, RemotePlayerController } from "@client/scenes/game/entities/player/PlayerController";
import type { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";
import type { MoveSender } from "@client/scenes/game/application/network/PlayerMoveSender";
import type { LoopFrameContext, LoopFrameEffects, LoopStep } from "./LoopStep";

/** SimulationStep の初期化入力 */
type SimulationStepOptions = {
  moveSender: MoveSender;
  nowMsProvider?: () => number;
};

type SimulationStepParams = {
  me: LocalPlayerController;
  playerRepository: PlayerRepository;
  deltaSeconds: number;
  isMoving: boolean;
};

/** シミュレーション段の更新処理を担うステップ */
export class SimulationStep implements LoopStep {
  private readonly moveSender: MoveSender;
  private readonly nowMsProvider: () => number;
  private lastPositionSentTime = 0;
  private wasMoving = false;

  constructor({ moveSender, nowMsProvider = () => performance.now() }: SimulationStepOptions) {
    this.moveSender = moveSender;
    this.nowMsProvider = nowMsProvider;
  }

  /** ローカル更新とリモート補間更新を実行する */
  public run(
    context: Readonly<LoopFrameContext>,
    _effects: LoopFrameEffects,
  ): void {
    const params: SimulationStepParams = {
      me: context.me,
      playerRepository: context.playerRepository,
      deltaSeconds: context.deltaSeconds,
      isMoving: context.isMoving,
    };

    this.runLocalSimulation({ me: params.me, isMoving: params.isMoving });
    this.runRemoteSimulation({
      playerRepository: params.playerRepository,
      deltaSeconds: params.deltaSeconds,
    });
  }

  private runLocalSimulation({ me, isMoving }: Pick<SimulationStepParams, "me" | "isMoving">) {
    if (isMoving) {
      me.tick();

      const now = this.nowMsProvider();
      if (now - this.lastPositionSentTime >= config.GAME_CONFIG.PLAYER_POSITION_UPDATE_MS) {
        const position = me.getPosition();
        this.moveSender.sendMove(position.x, position.y);
        this.lastPositionSentTime = now;
      }
    } else if (this.wasMoving) {
      me.tick();
      const position = me.getPosition();
      this.moveSender.sendMove(position.x, position.y);
    } else {
      me.tick();
    }

    this.wasMoving = isMoving;
  }

  private runRemoteSimulation({ playerRepository, deltaSeconds }: Pick<SimulationStepParams, "playerRepository" | "deltaSeconds">) {
    playerRepository.values().forEach((player) => {
      if (player instanceof RemotePlayerController) {
        player.tick(deltaSeconds);
      }
    });
  }
}