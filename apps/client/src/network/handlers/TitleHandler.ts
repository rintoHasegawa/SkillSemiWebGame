import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type { roomTypes } from "@repo/shared";

type TitleHandler = {
  joinRoom: (payload: roomTypes.JoinRoomPayload) => void;
};

export const createTitleHandler = (socket: Socket): TitleHandler => {
  return {
    joinRoom: (payload: roomTypes.JoinRoomPayload) => {
      socket.emit(protocol.SocketEvents.JOIN_ROOM, payload);
    }
  };
};

export type { TitleHandler };
