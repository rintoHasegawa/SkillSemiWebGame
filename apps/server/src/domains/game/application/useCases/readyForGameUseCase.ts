import type { ReadyForGamePort } from "../ports/gameUseCasePorts";
import type { playerTypes } from "@repo/shared";
import { logEvent } from "@server/logging/logEvent";

type ReadyForGameUseCaseParams = {
  socketId: string;
  roomId?: string;
  gameSessionManager: ReadyForGamePort;
  publishCurrentPlayers: (players: playerTypes.PlayerData[]) => void;
  publishGameStart: (payload: { startTime: number }) => void;
};

export const readyForGameUseCase = ({
  socketId,
  roomId,
  gameSessionManager,
  publishCurrentPlayers,
  publishGameStart,
}: ReadyForGameUseCaseParams) => {
  if (!roomId) {
    publishCurrentPlayers([]);
    logEvent("GameUseCase", {
      event: "READY_FOR_GAME",
      result: "ignored_missing_room",
      socketId,
    });
    return;
  }

  const roomPlayers = gameSessionManager.getRoomPlayers(roomId);
  publishCurrentPlayers(roomPlayers);

  logEvent("GameUseCase", {
    event: "READY_FOR_GAME",
    result: "received",
    socketId,
    roomId,
    totalPlayers: roomPlayers.length,
  });

  const startTime = gameSessionManager.getRoomStartTime(roomId);
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
