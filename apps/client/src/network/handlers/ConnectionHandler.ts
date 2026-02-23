import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";

type ConnectionHandler = {
  onConnect: (callback: (id: string) => void) => void;
};

export const createConnectionHandler = (socket: Socket): ConnectionHandler => {
  return {
    onConnect: (callback: (id: string) => void) => {
      if (socket.connected) {
        callback(socket.id || "");
      }

      socket.on(protocol.SocketEvents.CONNECT, () => {
        callback(socket.id || "");
      });
    }
  };
};

export type { ConnectionHandler };
