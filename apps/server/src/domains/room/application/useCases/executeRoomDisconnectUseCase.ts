import { protocol } from "@repo/shared";
import { RoomManager } from "@server/domains/room/RoomManager";

type EmitToRoom = (roomId: string, event: string, payload?: unknown) => void;

type ExecuteRoomDisconnectUseCaseParams = {
  roomManager: RoomManager;
  socketId: string;
  emitToRoom: EmitToRoom;
};

export const executeRoomDisconnectUseCase = ({
  roomManager,
  socketId,
  emitToRoom,
}: ExecuteRoomDisconnectUseCaseParams) => {
  const updatedRooms = roomManager.removePlayer(socketId);
  console.log("[RoomHandler] disconnect cleanup", {
    socketId,
    updatedRoomCount: updatedRooms.length,
  });

  updatedRooms.forEach((room) => {
    emitToRoom(room.roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    console.log("[RoomHandler] ROOM_UPDATE emitted", {
      roomId: room.roomId,
      ownerId: room.ownerId,
      totalPlayers: room.players.length,
    });
  });
};
