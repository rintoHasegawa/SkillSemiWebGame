import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type { ClientToServerPayloadOf, ServerToClientPayloadOf } from "@repo/shared";
import { createClientSocketEventBridge } from "./socketEventBridge";

type TitleHandler = {
  joinRoom: (payload: ClientToServerPayloadOf<typeof protocol.SocketEvents.JOIN_ROOM>) => void;
  onJoinRejected: (callback: (payload: ServerToClientPayloadOf<typeof protocol.SocketEvents.ROOM_JOIN_REJECTED>) => void) => void;
  onceJoinRejected: (callback: (payload: ServerToClientPayloadOf<typeof protocol.SocketEvents.ROOM_JOIN_REJECTED>) => void) => void;
  offJoinRejected: (callback: (payload: ServerToClientPayloadOf<typeof protocol.SocketEvents.ROOM_JOIN_REJECTED>) => void) => void;
};

export const createTitleHandler = (socket: Socket): TitleHandler => {
  const { onEvent, onceEvent, offEvent, emitEvent } = createClientSocketEventBridge(socket);

  return {
    joinRoom: (payload) => {
      emitEvent(protocol.SocketEvents.JOIN_ROOM, payload);
    },
    onJoinRejected: (callback) => {
      onEvent(protocol.SocketEvents.ROOM_JOIN_REJECTED, callback);
    },
    onceJoinRejected: (callback) => {
      onceEvent(protocol.SocketEvents.ROOM_JOIN_REJECTED, callback);
    },
    offJoinRejected: (callback) => {
      offEvent(protocol.SocketEvents.ROOM_JOIN_REJECTED, callback);
    }
  };
};

export type { TitleHandler };
