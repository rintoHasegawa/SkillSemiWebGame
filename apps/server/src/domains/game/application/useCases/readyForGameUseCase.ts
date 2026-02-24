import { protocol } from "@repo/shared";
import type { ReadyForGamePort } from "../ports/gameUseCasePorts";

type EmitToSocket = (event: string, payload?: unknown) => void;

type ReadyForGameUseCaseParams = {
  socketId: string;
  roomId?: string;
  gameManager: ReadyForGamePort;
  emitToSocket: EmitToSocket;
};

export const readyForGameUseCase = ({
  socketId,
  roomId,
  gameManager,
  emitToSocket,
}: ReadyForGameUseCaseParams) => {
  const allPlayers = gameManager.getAllPlayers();
  emitToSocket(protocol.SocketEvents.CURRENT_PLAYERS, allPlayers);

  console.log("[GameHandler] READY_FOR_GAME received", {
    socketId,
    totalPlayers: allPlayers.length,
  });

  if (!roomId) {
    console.log("[GameHandler] READY_FOR_GAME missing roomId", { socketId });
    return;
  }

  const startTime = gameManager.getRoomStartTime(roomId);
  if (!startTime) {
    return;
  }

  emitToSocket(protocol.SocketEvents.GAME_START, { startTime });
  console.log("[GameHandler] GAME_START sent to ready client", {
    socketId,
    roomId,
    startTime,
  });
};
