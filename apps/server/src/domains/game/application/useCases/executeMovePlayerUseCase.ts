import type { playerTypes } from "@repo/shared";
import type { MovePlayerPort } from "../ports/gameUseCasePorts";

type ExecuteMovePlayerUseCaseParams = {
  gameManager: MovePlayerPort;
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
