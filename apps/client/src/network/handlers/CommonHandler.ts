import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type { PayloadOf, SocketPayloadMap } from "@repo/shared";

type SocketEventName = keyof SocketPayloadMap;

type CommonHandler = {
  onConnect: (callback: (id: string) => void) => void;
  offConnect: (callback: (id: string) => void) => void;
};

export const createCommonHandler = (socket: Socket): CommonHandler => {
  const connectListenerMap = new Map<
    (id: string) => void,
    (payload: PayloadOf<typeof protocol.SocketEvents.CONNECT>) => void
  >();

  const onEvent = <TEvent extends SocketEventName>(
    event: TEvent,
    callback: (payload: PayloadOf<TEvent>) => void
  ) => {
    (socket as any).on(event, callback);
  };

  const offEvent = <TEvent extends SocketEventName>(
    event: TEvent,
    callback: (payload: PayloadOf<TEvent>) => void
  ) => {
    (socket as any).off(event, callback);
  };

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
