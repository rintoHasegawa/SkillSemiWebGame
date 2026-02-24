import type { playerTypes } from "@repo/shared";
import type { MovePlayerPort } from "../ports/gameUseCasePorts";

type MovePlayerUseCaseParams = {
  gameSessionManager: MovePlayerPort;
  playerId: string;
  move: playerTypes.MovePayload;
};

export const movePlayerUseCase = ({
  gameSessionManager,
  playerId,
  move,
}: MovePlayerUseCaseParams) => {
  gameSessionManager.movePlayer(playerId, move.x, move.y);
};
