import type { DisconnectPlayerPort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type DisconnectUseCaseParams = {
  gameManager: DisconnectPlayerPort;
  playerId: string;
  publishPlayerRemoved: (playerId: string) => void;
};

export const disconnectUseCase = ({
  gameManager,
  playerId,
  publishPlayerRemoved,
}: DisconnectUseCaseParams) => {
  gameManager.removePlayer(playerId);
  publishPlayerRemoved(playerId);
  logEvent("GameUseCase", {
    event: "DISCONNECT",
    result: "player_removed",
    socketId: playerId,
  });
};
