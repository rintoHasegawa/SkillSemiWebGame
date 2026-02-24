import { Server } from "socket.io";
import { protocol } from "@repo/shared";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";
import type { roomTypes } from "@repo/shared";
import type { CommonHandlerContext } from "../CommonHandler";

type RoomId = roomTypes.Room["roomId"];
type RoomUpdatePayload = roomTypes.Room;

export type RoomEventPublisher = {
  publishRoomUpdate: (roomId: RoomId, room: RoomUpdatePayload) => void;
};

export const createRoomEventPublisher = (
  common: CommonHandlerContext
): RoomEventPublisher => {
  return {
    publishRoomUpdate: (roomId: RoomId, room: RoomUpdatePayload) => {
      common.emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    },
  };
};

export const createRoomDisconnectPublisher = (io: Server): RoomEventPublisher => {
  const emitToRoom = createEmitToRoom(io);

  return {
    publishRoomUpdate: (roomId: RoomId, room: RoomUpdatePayload) => {
      emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    },
  };
};
