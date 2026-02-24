import { GameManager } from "@server/domains/game/GameManager";
import type { playerTypes } from "@repo/shared";
import { executeMovePlayerUseCase } from "@server/domains/game/application/useCases/executeMovePlayerUseCase";

export const onMove = (
  gameManager: GameManager,
  playerId: string,
  data: playerTypes.MovePayload
) => {
  executeMovePlayerUseCase({
    gameManager,
    playerId,
    move: data,
  });
};
