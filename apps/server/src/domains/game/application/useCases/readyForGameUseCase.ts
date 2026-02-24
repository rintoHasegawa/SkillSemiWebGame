import type { ReadyForGamePort } from "../ports/gameUseCasePorts";
import type { GameOutputPort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type ReadyForGameUseCaseParams = {
  socketId: string;
  roomId?: string;
  gameManager: ReadyForGamePort;
  output: Pick<GameOutputPort, "publishCurrentPlayersToSocket" | "publishGameStartToSocket">;
};

export const readyForGameUseCase = ({
  socketId,
  roomId,
  gameManager,
  output,
}: ReadyForGameUseCaseParams) => {
  if (!roomId) {
    output.publishCurrentPlayersToSocket([]);
    logEvent("GameUseCase", {
      event: "READY_FOR_GAME",
      result: "ignored_missing_room",
      socketId,
    });
    return;
  }

  const roomPlayers = gameManager.getRoomPlayers(roomId);
  output.publishCurrentPlayersToSocket(roomPlayers);

  logEvent("GameUseCase", {
    event: "READY_FOR_GAME",
    result: "received",
    socketId,
    roomId,
    totalPlayers: roomPlayers.length,
  });

  const startTime = gameManager.getRoomStartTime(roomId);
  if (!startTime) {
    return;
  }

  output.publishGameStartToSocket({ startTime });
  logEvent("GameUseCase", {
    event: "GAME_START",
    result: "emitted",
    socketId,
    roomId,
    startTime,
  });
};
