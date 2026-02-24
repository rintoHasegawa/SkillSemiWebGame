import type { DisconnectPlayerPort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type DisconnectUseCaseParams = {
  gameSessionManager: DisconnectPlayerPort;
  playerId: string;
  publishPlayerRemoved: (playerId: string) => void;
};

export const disconnectUseCase = ({
  gameSessionManager,
  playerId,
  publishPlayerRemoved,
}: DisconnectUseCaseParams) => {
  gameSessionManager.removePlayer(playerId);
  publishPlayerRemoved(playerId);
  logEvent("GameUseCase", {
    event: "DISCONNECT",
    result: "player_removed",
    socketId: playerId,
  });
};
