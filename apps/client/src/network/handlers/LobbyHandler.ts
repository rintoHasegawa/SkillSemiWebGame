import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type { roomTypes } from "@repo/shared";

type LobbyHandler = {
  onRoomUpdate: (callback: (room: roomTypes.Room) => void) => void;
  startGame: () => void;
};

export const createLobbyHandler = (socket: Socket): LobbyHandler => {
  return {
    onRoomUpdate: (callback: (room: roomTypes.Room) => void) => {
      socket.on(protocol.SocketEvents.ROOM_UPDATE, callback);
    },
    startGame: () => {
      socket.emit(protocol.SocketEvents.START_GAME);
    }
  };
};

export type { LobbyHandler };
