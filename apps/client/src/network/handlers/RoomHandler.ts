import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type { roomTypes } from "@repo/shared";

type RoomHandler = {
  joinRoom: (payload: roomTypes.JoinRoomPayload) => void;
  onRoomUpdate: (callback: (room: roomTypes.Room) => void) => void;
  startGame: () => void;
};

export const createRoomHandler = (socket: Socket): RoomHandler => {
  return {
    joinRoom: (payload: roomTypes.JoinRoomPayload) => {
      socket.emit(protocol.SocketEvents.JOIN_ROOM, payload);
    },
    onRoomUpdate: (callback: (room: roomTypes.Room) => void) => {
      socket.on(protocol.SocketEvents.ROOM_UPDATE, callback);
    },
    startGame: () => {
      socket.emit(protocol.SocketEvents.START_GAME);
    }
  };
};

export type { RoomHandler };
