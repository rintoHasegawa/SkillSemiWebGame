import type { DisconnectPlayerPort, GameOutputPort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type DisconnectUseCaseParams = {
  gameManager: DisconnectPlayerPort;
  roomId?: string;
  playerId: string;
  output: Pick<GameOutputPort, "publishPlayerRemovedToRoom">;
};

export const disconnectUseCase = ({
  gameManager,
  roomId,
  playerId,
  output,
}: DisconnectUseCaseParams) => {
  gameManager.removePlayer(playerId);

  if (roomId) {
    output.publishPlayerRemovedToRoom(roomId, playerId);
  }

  logEvent("GameUseCase", {
    event: "DISCONNECT",
    result: "player_removed",
    socketId: playerId,
  });
};
