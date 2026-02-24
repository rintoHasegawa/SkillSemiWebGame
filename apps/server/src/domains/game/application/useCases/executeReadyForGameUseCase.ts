import { protocol } from "@repo/shared";
import { GameManager } from "@server/domains/game/GameManager";

type EmitToSocket = (event: string, payload?: unknown) => void;

type ExecuteReadyForGameUseCaseParams = {
  socketId: string;
  roomId?: string;
  gameManager: GameManager;
  emitToSocket: EmitToSocket;
};

export const executeReadyForGameUseCase = ({
  socketId,
  roomId,
  gameManager,
  emitToSocket,
}: ExecuteReadyForGameUseCaseParams) => {
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
