import { config } from "@repo/shared";
import { socketManager } from "@client/network/SocketManager";
import { LocalPlayerController, RemotePlayerController } from "../../entities/player/PlayerController";
import type { GamePlayers } from "../game.types";

type SimulationStepParams = {
  me: LocalPlayerController;
  players: GamePlayers;
  deltaSeconds: number;
  isMoving: boolean;
};

export class SimulationStep {
  private lastPositionSentTime = 0;
  private wasMoving = false;

  public run({ me, players, deltaSeconds, isMoving }: SimulationStepParams) {
    if (isMoving) {
      me.tick();

      const now = performance.now();
      if (now - this.lastPositionSentTime >= config.GAME_CONFIG.PLAYER_POSITION_UPDATE_MS) {
        const position = me.getPosition();
        socketManager.game.sendMove(position.x, position.y);
        this.lastPositionSentTime = now;
      }
    } else if (this.wasMoving) {
      me.tick();
      const position = me.getPosition();
      socketManager.game.sendMove(position.x, position.y);
    } else {
      me.tick();
    }

    this.wasMoving = isMoving;

    Object.values(players).forEach((player) => {
      if (player instanceof RemotePlayerController) {
        player.tick(deltaSeconds);
      }
    });
  }
}