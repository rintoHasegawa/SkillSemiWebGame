import { protocol, roomConsts } from "@repo/shared";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";

type EmitToRoom = (roomId: string, event: string, payload?: unknown) => void;

type ExecuteStartGameUseCaseParams = {
  ownerId: string;
  gameManager: GameManager;
  roomManager: RoomManager;
  emitToRoom: EmitToRoom;
};

export const executeStartGameUseCase = ({
  ownerId,
  gameManager,
  roomManager,
  emitToRoom,
}: ExecuteStartGameUseCaseParams) => {
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
        emitToRoom(room.roomId, protocol.SocketEvents.UPDATE_PLAYER, playerData);
      });

      if (tickData.cellUpdates.length > 0) {
        emitToRoom(room.roomId, protocol.SocketEvents.UPDATE_MAP_CELLS, tickData.cellUpdates);
      }
    },
    () => {
      console.log(`[GameHandler] ルーム ${room.roomId} のゲームが終了しました (3分経過)`);
      emitToRoom(room.roomId, protocol.SocketEvents.GAME_END);
      room.status = roomConsts.RoomPhase.WAITING;
    }
  );

  const startTime = gameManager.getRoomStartTime(room.roomId) || Date.now();
  emitToRoom(room.roomId, protocol.SocketEvents.GAME_START, { startTime });
};
