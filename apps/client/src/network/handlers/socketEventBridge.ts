import type { Socket } from "socket.io-client";
import type { PayloadOf, SocketPayloadMap } from "@repo/shared";

type SocketEventName = keyof SocketPayloadMap;

export const createClientSocketEventBridge = (socket: Socket) => {
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

  function emitEvent<TEvent extends SocketEventName>(event: TEvent): void;
  function emitEvent<TEvent extends SocketEventName>(event: TEvent, payload: PayloadOf<TEvent>): void;
  function emitEvent<TEvent extends SocketEventName>(event: TEvent, payload?: PayloadOf<TEvent>): void {
    if (payload === undefined) {
      (socket as any).emit(event);
      return;
    }

    (socket as any).emit(event, payload);
  }

  return {
    onEvent,
    offEvent,
    emitEvent,
  };
};
