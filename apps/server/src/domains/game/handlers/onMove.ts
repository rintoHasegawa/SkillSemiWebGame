import { GameManager } from "@server/domains/game/GameManager";
import type { playerTypes } from "@repo/shared";
import { movePlayerUseCase } from "@server/domains/game/application/useCases/movePlayerUseCase";

export const onMove = (
  gameManager: GameManager,
  playerId: string,
  data: playerTypes.MovePayload
) => {
  movePlayerUseCase({
    gameManager,
    playerId,
    move: data,
  });
};
