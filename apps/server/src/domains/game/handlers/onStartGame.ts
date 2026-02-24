import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { protocol, roomConsts } from "@repo/shared";

export const onStartGame = (
  io: Server,
  gameManager: GameManager,
  roomManager: RoomManager,
  ownerId: string
) => {
  const room = roomManager.getRoomByOwnerId(ownerId);
  if (!room) {
    console.log("[GameHandler] START_GAME ignored (no room)", { socketId: ownerId });
    return;
  }

  if (room.status === roomConsts.RoomPhase.PLAYING) {
    console.log("[GameHandler] START_GAME ignored (already playing)", { roomId: room.roomId });
    return;
  }

  console.log("[GameHandler] START_GAME accepted", {
    roomId: room.roomId,
    ownerId,
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
        io.to(room.roomId).emit(protocol.SocketEvents.UPDATE_PLAYER, playerData);
      });

      if (tickData.cellUpdates.length > 0) {
        io.to(room.roomId).emit(protocol.SocketEvents.UPDATE_MAP_CELLS, tickData.cellUpdates);
      }
    },
    () => {
      console.log(`[GameHandler] ルーム ${room.roomId} のゲームが終了しました (3分経過)`);
      io.to(room.roomId).emit(protocol.SocketEvents.GAME_END);
      room.status = roomConsts.RoomPhase.WAITING;
    }
  );

  const startTime = gameManager.getRoomStartTime(room.roomId) || Date.now();
  io.to(room.roomId).emit(protocol.SocketEvents.GAME_START, { startTime });
};
