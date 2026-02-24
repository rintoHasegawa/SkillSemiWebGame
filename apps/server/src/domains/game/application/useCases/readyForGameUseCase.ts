import { protocol } from "@repo/shared";
import type { ReadyForGamePort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

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

  logEvent("GameUseCase", {
    event: "READY_FOR_GAME",
    result: "received",
    socketId,
    roomId,
    totalPlayers: allPlayers.length,
  });

  if (!roomId) {
    logEvent("GameUseCase", {
      event: "READY_FOR_GAME",
      result: "ignored_missing_room",
      socketId,
    });
    return;
  }

  const startTime = gameManager.getRoomStartTime(roomId);
  if (!startTime) {
    return;
  }

  emitToSocket(protocol.SocketEvents.GAME_START, { startTime });
  logEvent("GameUseCase", {
    event: "GAME_START",
    result: "emitted",
    socketId,
    roomId,
    startTime,
  });
};
