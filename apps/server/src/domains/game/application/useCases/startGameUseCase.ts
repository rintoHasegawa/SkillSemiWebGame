import type { GameOutputPort, StartGamePort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type StartGameUseCaseParams = {
  roomId: string;
  playerIds: string[];
  gameManager: StartGamePort;
  onGameEnd: () => void;
  output: Pick<
    GameOutputPort,
    | "publishUpdatePlayerToRoom"
    | "publishMapCellUpdatesToRoom"
    | "publishGameEndToRoom"
    | "publishGameStartToRoom"
  >;
};

export const startGameUseCase = ({
  roomId,
  playerIds,
  gameManager,
  onGameEnd,
  output,
}: StartGameUseCaseParams) => {
  gameManager.startRoomSession(
    roomId,
    playerIds,
    (tickData) => {
      tickData.players.forEach((playerData) => {
        output.publishUpdatePlayerToRoom(roomId, playerData);
      });

      if (tickData.cellUpdates.length > 0) {
        output.publishMapCellUpdatesToRoom(roomId, tickData.cellUpdates);
      }
    },
    () => {
      logEvent("GameUseCase", {
        event: "GAME_END",
        result: "emitted",
        roomId,
        reason: "duration_elapsed",
      });
      output.publishGameEndToRoom(roomId);
      onGameEnd();
    }
  );

  const startTime = gameManager.getRoomStartTime(roomId) || Date.now();
  output.publishGameStartToRoom(roomId, { startTime });
};
