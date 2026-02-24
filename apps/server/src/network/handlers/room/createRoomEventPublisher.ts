import { Server } from "socket.io";
import { protocol } from "@repo/shared";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";
import type { roomTypes } from "@repo/shared";
import type { CommonHandlerContext } from "../CommonHandler";

export type RoomEventPublisher = {
  publishRoomUpdate: (roomId: string, room: roomTypes.Room) => void;
};

export const createRoomEventPublisher = (
  common: CommonHandlerContext
): RoomEventPublisher => {
  return {
    publishRoomUpdate: (roomId: string, room: roomTypes.Room) => {
      common.emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    },
  };
};

export const createRoomDisconnectPublisher = (io: Server): RoomEventPublisher => {
  const emitToRoom = createEmitToRoom(io);

  return {
    publishRoomUpdate: (roomId: string, room: roomTypes.Room) => {
      emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    },
  };
};
