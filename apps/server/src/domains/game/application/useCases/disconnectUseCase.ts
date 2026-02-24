import { protocol } from "@repo/shared";
import type { DisconnectPlayerPort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type EmitToAll = (event: string, payload?: unknown) => void;

type DisconnectUseCaseParams = {
  gameManager: DisconnectPlayerPort;
  playerId: string;
  emitToAll: EmitToAll;
};

export const disconnectUseCase = ({
  gameManager,
  playerId,
  emitToAll,
}: DisconnectUseCaseParams) => {
  gameManager.removePlayer(playerId);
  emitToAll(protocol.SocketEvents.REMOVE_PLAYER, playerId);
  logEvent("GameUseCase", {
    event: "DISCONNECT",
    result: "player_removed",
    socketId: playerId,
  });
};
