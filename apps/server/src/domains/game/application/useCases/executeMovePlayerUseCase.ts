import { GameManager } from "@server/domains/game/GameManager";
import type { playerTypes } from "@repo/shared";

type ExecuteMovePlayerUseCaseParams = {
  gameManager: GameManager;
  playerId: string;
  move: playerTypes.MovePayload;
};

export const executeMovePlayerUseCase = ({
  gameManager,
  playerId,
  move,
}: ExecuteMovePlayerUseCaseParams) => {
  gameManager.movePlayer(playerId, move.x, move.y);
};
