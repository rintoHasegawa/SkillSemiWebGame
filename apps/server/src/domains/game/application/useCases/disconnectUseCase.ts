import { protocol } from "@repo/shared";
import type { DisconnectPlayerPort } from "../ports/gameUseCasePorts";

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
  console.log("[GameHandler] player removed", { playerId });
};
