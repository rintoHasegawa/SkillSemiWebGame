import { roomConsts } from "@repo/shared";
import { GameManager } from "@server/domains/game/GameManager";
import { type GameOutputPort } from "@server/domains/game/application/ports/gameUseCasePorts";
import { startGameUseCase } from "@server/domains/game/application/useCases/startGameUseCase";
import { RoomManager } from "@server/domains/room/RoomManager";
import { logEvent } from "@server/logging/logEvent";

type StartGameCoordinatorParams = {
  ownerId: string;
  gameManager: GameManager;
  roomManager: RoomManager;
  output: Pick<
    GameOutputPort,
    | "publishUpdatePlayerToRoom"
    | "publishMapCellUpdatesToRoom"
    | "publishGameEndToRoom"
    | "publishGameStartToRoom"
  >;
};

export const startGameCoordinator = ({
  ownerId,
  gameManager,
  roomManager,
  output,
}: StartGameCoordinatorParams) => {
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

  const updatedRoom = roomManager.markRoomPlaying(room.roomId);
  if (!updatedRoom) {
    logEvent("GameUseCase", {
      event: "START_GAME",
      result: "ignored_room_not_found",
      roomId: room.roomId,
      socketId: ownerId,
    });
    return;
  }

  logEvent("GameUseCase", {
    event: "START_GAME",
    result: "accepted",
    roomId: updatedRoom.roomId,
    socketId: ownerId,
    totalPlayers: updatedRoom.players.length,
  });

  const playerIds = updatedRoom.players.map((player) => player.id);

  startGameUseCase({
    roomId: updatedRoom.roomId,
    playerIds,
    gameManager,
    onGameEnd: () => {
      roomManager.markRoomWaiting(updatedRoom.roomId);
    },
    output,
  });
};
