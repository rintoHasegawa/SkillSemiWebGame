import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type { PayloadOf } from "@repo/shared";
import { createClientSocketEventBridge } from "./socketEventBridge";

type LobbyHandler = {
  onRoomUpdate: (callback: (room: PayloadOf<typeof protocol.SocketEvents.ROOM_UPDATE>) => void) => void;
  onceRoomUpdate: (callback: (room: PayloadOf<typeof protocol.SocketEvents.ROOM_UPDATE>) => void) => void;
  offRoomUpdate: (callback: (room: PayloadOf<typeof protocol.SocketEvents.ROOM_UPDATE>) => void) => void;
  startGame: () => void;
};

export const createLobbyHandler = (socket: Socket): LobbyHandler => {
  const { onEvent, onceEvent, offEvent, emitEvent } = createClientSocketEventBridge(socket);

  return {
    onRoomUpdate: (callback) => {
      onEvent(protocol.SocketEvents.ROOM_UPDATE, callback);
    },
    onceRoomUpdate: (callback) => {
      onceEvent(protocol.SocketEvents.ROOM_UPDATE, callback);
    },
    offRoomUpdate: (callback) => {
      offEvent(protocol.SocketEvents.ROOM_UPDATE, callback);
    },
    startGame: () => {
      emitEvent(protocol.SocketEvents.START_GAME);
    }
  };
};

export type { LobbyHandler };
