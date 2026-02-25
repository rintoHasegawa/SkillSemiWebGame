import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type { PayloadOf, SocketPayloadMap } from "@repo/shared";

type SocketEventName = Exclude<keyof SocketPayloadMap, "connect" | "disconnect">;

type TitleHandler = {
  joinRoom: (payload: PayloadOf<typeof protocol.SocketEvents.JOIN_ROOM>) => void;
  onJoinRejected: (callback: (payload: PayloadOf<typeof protocol.SocketEvents.ROOM_JOIN_REJECTED>) => void) => void;
  offJoinRejected: (callback: (payload: PayloadOf<typeof protocol.SocketEvents.ROOM_JOIN_REJECTED>) => void) => void;
};

export const createTitleHandler = (socket: Socket): TitleHandler => {
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
    joinRoom: (payload) => {
      emitEvent(protocol.SocketEvents.JOIN_ROOM, payload);
    },
    onJoinRejected: (callback) => {
      onEvent(protocol.SocketEvents.ROOM_JOIN_REJECTED, callback);
    },
    offJoinRejected: (callback) => {
      offEvent(protocol.SocketEvents.ROOM_JOIN_REJECTED, callback);
    }
  };
};

export type { TitleHandler };
