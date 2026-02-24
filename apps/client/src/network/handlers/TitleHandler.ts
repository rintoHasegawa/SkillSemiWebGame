import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type { roomTypes } from "@repo/shared";

type TitleHandler = {
  joinRoom: (payload: roomTypes.JoinRoomPayload) => void;
  onJoinRejected: (callback: (payload: roomTypes.JoinRoomRejectedPayload) => void) => void;
  offJoinRejected: (callback: (payload: roomTypes.JoinRoomRejectedPayload) => void) => void;
};

export const createTitleHandler = (socket: Socket): TitleHandler => {
  return {
    joinRoom: (payload: roomTypes.JoinRoomPayload) => {
      socket.emit(protocol.SocketEvents.JOIN_ROOM, payload);
    },
    onJoinRejected: (callback: (payload: roomTypes.JoinRoomRejectedPayload) => void) => {
      socket.on(protocol.SocketEvents.ROOM_JOIN_REJECTED, callback);
    },
    offJoinRejected: (callback: (payload: roomTypes.JoinRoomRejectedPayload) => void) => {
      socket.off(protocol.SocketEvents.ROOM_JOIN_REJECTED, callback);
    }
  };
};

export type { TitleHandler };
