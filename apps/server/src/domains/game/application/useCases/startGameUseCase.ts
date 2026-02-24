import { roomConsts } from "@repo/shared";
import { RoomManager } from "@server/domains/room/RoomManager";
import type { GameOutputPort, StartGamePort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type StartGameUseCaseParams = {
  ownerId: string;
  gameManager: StartGamePort;
  roomManager: RoomManager;
  output: Pick<
    GameOutputPort,
    | "publishUpdatePlayerToRoom"
    | "publishMapCellUpdatesToRoom"
    | "publishGameEndToRoom"
    | "publishGameStartToRoom"
  >;
};

export const startGameUseCase = ({
  ownerId,
  gameManager,
  roomManager,
  output,
}: StartGameUseCaseParams) => {
  const room = roomManager.getRoomByOwnerId(ownerId);
  if (!room) {
    logEvent("GameUseCase", {
      event: "START_GAME",
      result: "ignored_no_room",
      socketId: ownerId,
    });
    return;
  }

  if (room.status === roomConsts.RoomPhase.PLAYING) {
    logEvent("GameUseCase", {
      event: "START_GAME",
      result: "ignored_already_playing",
      roomId: room.roomId,
      socketId: ownerId,
    });
    return;
  }

  logEvent("GameUseCase", {
    event: "START_GAME",
    result: "accepted",
    roomId: room.roomId,
    socketId: ownerId,
    totalPlayers: room.players.length,
  });

  room.status = roomConsts.RoomPhase.PLAYING;

  const playerIds = room.players.map((p: { id: string }) => p.id);

  gameManager.startRoomSession(
    room.roomId,
    playerIds,
    (tickData) => {
      tickData.players.forEach((playerData) => {
        output.publishUpdatePlayerToRoom(room.roomId, playerData);
      });

      if (tickData.cellUpdates.length > 0) {
        output.publishMapCellUpdatesToRoom(room.roomId, tickData.cellUpdates);
      }
    },
    () => {
      logEvent("GameUseCase", {
        event: "GAME_END",
        result: "emitted",
        roomId: room.roomId,
        reason: "duration_elapsed",
      });
      output.publishGameEndToRoom(room.roomId);
      room.status = roomConsts.RoomPhase.WAITING;
    }
  );

  const startTime = gameManager.getRoomStartTime(room.roomId) || Date.now();
  output.publishGameStartToRoom(room.roomId, { startTime });
};
