import { protocol } from "@repo/shared";
import type { DisconnectPlayerPort } from "../ports/gameUseCasePorts";

type EmitToAll = (event: string, payload?: unknown) => void;

type ExecuteDisconnectUseCaseParams = {
  gameManager: DisconnectPlayerPort;
  playerId: string;
  emitToAll: EmitToAll;
};

export const executeDisconnectUseCase = ({
  gameManager,
  playerId,
  emitToAll,
}: ExecuteDisconnectUseCaseParams) => {
  gameManager.removePlayer(playerId);
  emitToAll(protocol.SocketEvents.REMOVE_PLAYER, playerId);
  console.log("[GameHandler] player removed", { playerId });
};
