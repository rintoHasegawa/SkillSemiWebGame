import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";

type CommonHandler = {
  onConnect: (callback: (id: string) => void) => void;
  offConnect: (callback: (id: string) => void) => void;
};

export const createCommonHandler = (socket: Socket): CommonHandler => {
  const connectListenerMap = new Map<(id: string) => void, () => void>();

  return {
    onConnect: (callback: (id: string) => void) => {
      if (socket.connected) {
        callback(socket.id || "");
      }

      const listener = () => {
        callback(socket.id || "");
      };

      connectListenerMap.set(callback, listener);
      socket.on(protocol.SocketEvents.CONNECT, listener);
    },
    offConnect: (callback: (id: string) => void) => {
      const listener = connectListenerMap.get(callback);
      if (!listener) return;

      socket.off(protocol.SocketEvents.CONNECT, listener);
      connectListenerMap.delete(callback);
    }
  };
};

export type { CommonHandler };
