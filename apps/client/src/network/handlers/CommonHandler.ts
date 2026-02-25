import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type { PayloadOf } from "@repo/shared";
import { createClientSocketEventBridge } from "./socketEventBridge";

type CommonHandler = {
  onConnect: (callback: (id: string) => void) => void;
  offConnect: (callback: (id: string) => void) => void;
};

export const createCommonHandler = (socket: Socket): CommonHandler => {
  const connectListenerMap = new Map<
    (id: string) => void,
    (payload: PayloadOf<typeof protocol.SocketEvents.CONNECT>) => void
  >();

  const { onEvent, offEvent } = createClientSocketEventBridge(socket);

  return {
    onConnect: (callback: (id: string) => void) => {
      if (socket.connected) {
        callback(socket.id || "");
      }

      const listener = (_payload: PayloadOf<typeof protocol.SocketEvents.CONNECT>) => {
        callback(socket.id || "");
      };

      connectListenerMap.set(callback, listener);
      onEvent(protocol.SocketEvents.CONNECT, listener);
    },
    offConnect: (callback: (id: string) => void) => {
      const listener = connectListenerMap.get(callback);
      if (!listener) return;

      offEvent(protocol.SocketEvents.CONNECT, listener);
      connectListenerMap.delete(callback);
    }
  };
};

export type { CommonHandler };
