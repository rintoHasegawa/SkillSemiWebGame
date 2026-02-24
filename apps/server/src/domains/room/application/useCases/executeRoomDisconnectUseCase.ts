import { protocol } from "@repo/shared";
import type { DisconnectRoomPort } from "../ports/roomUseCasePorts";

type EmitToRoom = (roomId: string, event: string, payload?: unknown) => void;

type RoomDisconnectUseCaseParams = {
  roomManager: DisconnectRoomPort;
  socketId: string;
  emitToRoom: EmitToRoom;
};

export const roomDisconnectUseCase = ({
  roomManager,
  socketId,
  emitToRoom,
}: RoomDisconnectUseCaseParams) => {
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
