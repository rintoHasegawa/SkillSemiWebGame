import { protocol } from "@repo/shared";
import type { DisconnectRoomPort } from "../ports/roomUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

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
  logEvent("RoomUseCase", {
    event: "DISCONNECT",
    result: "processed",
    socketId,
    updatedRoomCount: updatedRooms.length,
  });

  updatedRooms.forEach((room) => {
    emitToRoom(room.roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    logEvent("RoomUseCase", {
      event: "ROOM_UPDATE",
      result: "emitted",
      roomId: room.roomId,
      socketId,
      ownerId: room.ownerId,
      totalPlayers: room.players.length,
    });
  });
};
