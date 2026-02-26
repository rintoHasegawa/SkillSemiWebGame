/**
 * SimulationStep
 * ゲームループのシミュレーション段を担う
 * ローカル更新とリモート補間更新を順に実行する
 */
import { config } from "@client/config";
import { LocalPlayerController, RemotePlayerController } from "@client/scenes/game/entities/player/PlayerController";
import type { MoveSender } from "@client/scenes/game/application/network/PlayerMoveSender";
import type { GamePlayers } from "../game.types";

/** SimulationStep の初期化入力 */
type SimulationStepOptions = {
  moveSender: MoveSender;
  nowMsProvider?: () => number;
};

type SimulationStepParams = {
  me: LocalPlayerController;
  players: GamePlayers;
  deltaSeconds: number;
  isMoving: boolean;
};

/** シミュレーション段の更新処理を担うステップ */
export class SimulationStep {
  private readonly moveSender: MoveSender;
  private readonly nowMsProvider: () => number;
  private lastPositionSentTime = 0;
  private wasMoving = false;

  constructor({ moveSender, nowMsProvider = () => performance.now() }: SimulationStepOptions) {
    this.moveSender = moveSender;
    this.nowMsProvider = nowMsProvider;
  }

  public run({ me, players, deltaSeconds, isMoving }: SimulationStepParams) {
    this.runLocalSimulation({ me, isMoving });
    this.runRemoteSimulation({ players, deltaSeconds });
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

  private runRemoteSimulation({ players, deltaSeconds }: Pick<SimulationStepParams, "players" | "deltaSeconds">) {
    Object.values(players).forEach((player) => {
      if (player instanceof RemotePlayerController) {
        player.tick(deltaSeconds);
      }
    });
  }
}