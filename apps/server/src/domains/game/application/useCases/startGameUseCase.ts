import { protocol, roomConsts } from "@repo/shared";
import { RoomManager } from "@server/domains/room/RoomManager";
import type { StartGamePort } from "../ports/gameUseCasePorts";
import { logEvent } from "@server/network/logging/logEvent";

type EmitToRoom = (roomId: string, event: string, payload?: unknown) => void;

type StartGameUseCaseParams = {
  ownerId: string;
  gameManager: StartGamePort;
  roomManager: RoomManager;
  emitToRoom: EmitToRoom;
};

export const startGameUseCase = ({
  ownerId,
  gameManager,
  roomManager,
  emitToRoom,
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
        emitToRoom(room.roomId, protocol.SocketEvents.UPDATE_PLAYER, playerData);
      });

      if (tickData.cellUpdates.length > 0) {
        emitToRoom(room.roomId, protocol.SocketEvents.UPDATE_MAP_CELLS, tickData.cellUpdates);
      }
    },
    () => {
      logEvent("GameUseCase", {
        event: "GAME_END",
        result: "emitted",
        roomId: room.roomId,
        reason: "duration_elapsed",
      });
      emitToRoom(room.roomId, protocol.SocketEvents.GAME_END);
      room.status = roomConsts.RoomPhase.WAITING;
    }
  );

  const startTime = gameManager.getRoomStartTime(room.roomId) || Date.now();
  emitToRoom(room.roomId, protocol.SocketEvents.GAME_START, { startTime });
};
