import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";

type CommonHandler = {
  onConnect: (callback: (id: string) => void) => void;
};

export const createCommonHandler = (socket: Socket): CommonHandler => {
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

export type { CommonHandler };
