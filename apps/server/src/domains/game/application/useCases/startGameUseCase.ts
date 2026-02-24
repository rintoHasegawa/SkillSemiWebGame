import { roomConsts } from "@repo/shared";
import type { gridMapTypes, playerTypes } from "@repo/shared";
import { RoomManager } from "@server/domains/room/RoomManager";
import type { StartGamePort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type StartGameUseCaseParams = {
  ownerId: string;
  gameManager: StartGamePort;
  roomManager: RoomManager;
  publishUpdatePlayer: (roomId: string, playerData: playerTypes.PlayerData) => void;
  publishMapCellUpdates: (roomId: string, cellUpdates: gridMapTypes.CellUpdate[]) => void;
  publishGameEnd: (roomId: string) => void;
  publishGameStart: (roomId: string, payload: { startTime: number }) => void;
};

export const startGameUseCase = ({
  ownerId,
  gameManager,
  roomManager,
  publishUpdatePlayer,
  publishMapCellUpdates,
  publishGameEnd,
  publishGameStart,
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

  room.players.forEach((p: { id: string }) => {
    gameManager.addPlayer(p.id);
  });

  gameManager.startGameLoop(
    room.roomId,
    playerIds,
    (tickData) => {
      tickData.players.forEach((playerData) => {
        publishUpdatePlayer(room.roomId, playerData);
      });

      if (tickData.cellUpdates.length > 0) {
        publishMapCellUpdates(room.roomId, tickData.cellUpdates);
      }
    },
    () => {
      logEvent("GameUseCase", {
        event: "GAME_END",
        result: "emitted",
        roomId: room.roomId,
        reason: "duration_elapsed",
      });
      publishGameEnd(room.roomId);
      room.status = roomConsts.RoomPhase.WAITING;
    }
  );

  const startTime = gameManager.getRoomStartTime(room.roomId) || Date.now();
  publishGameStart(room.roomId, { startTime });
};
