import type { playerTypes } from "@repo/shared";
import type { MovePlayerPort } from "../ports/gameUseCasePorts";

type MovePlayerUseCaseParams = {
  gameManager: MovePlayerPort;
  playerId: string;
  move: playerTypes.MovePayload;
};

export const movePlayerUseCase = ({
  gameManager,
  playerId,
  move,
}: MovePlayerUseCaseParams) => {
  gameManager.movePlayer(playerId, move.x, move.y);
};
