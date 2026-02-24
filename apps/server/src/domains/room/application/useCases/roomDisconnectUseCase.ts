import type { DisconnectRoomPort } from "../ports/roomUseCasePorts";
import type { roomTypes } from "@repo/shared";
import { logEvent } from "@server/logging/logEvent";

type RoomDisconnectUseCaseParams = {
  roomManager: DisconnectRoomPort;
  socketId: string;
  publishRoomUpdate: (roomId: string, room: roomTypes.Room) => void;
};

export const roomDisconnectUseCase = ({
  roomManager,
  socketId,
  publishRoomUpdate,
}: RoomDisconnectUseCaseParams) => {
  const updatedRooms = roomManager.removePlayer(socketId);
  logEvent("RoomUseCase", {
    event: "DISCONNECT",
    result: "processed",
    socketId,
    updatedRoomCount: updatedRooms.length,
  });

  updatedRooms.forEach((room) => {
    publishRoomUpdate(room.roomId, room);
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
