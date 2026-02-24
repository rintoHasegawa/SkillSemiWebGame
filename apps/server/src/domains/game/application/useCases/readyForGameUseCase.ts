import type { ReadyForGamePort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type ReadyForGameUseCaseParams = {
  socketId: string;
  roomId?: string;
  gameManager: ReadyForGamePort;
  publishCurrentPlayers: (players: unknown[]) => void;
  publishGameStart: (payload: { startTime: number }) => void;
};

export const readyForGameUseCase = ({
  socketId,
  roomId,
  gameManager,
  publishCurrentPlayers,
  publishGameStart,
}: ReadyForGameUseCaseParams) => {
  const allPlayers = gameManager.getAllPlayers();
  publishCurrentPlayers(allPlayers);

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

  publishGameStart({ startTime });
  logEvent("GameUseCase", {
    event: "GAME_START",
    result: "emitted",
    socketId,
    roomId,
    startTime,
  });
};
