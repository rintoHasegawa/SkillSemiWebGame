import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type { PayloadOf, SocketPayloadMap } from "@repo/shared";

type SocketEventName = Exclude<keyof SocketPayloadMap, "connect" | "disconnect">;

type LobbyHandler = {
  onRoomUpdate: (callback: (room: PayloadOf<typeof protocol.SocketEvents.ROOM_UPDATE>) => void) => void;
  offRoomUpdate: (callback: (room: PayloadOf<typeof protocol.SocketEvents.ROOM_UPDATE>) => void) => void;
  startGame: () => void;
};

export const createLobbyHandler = (socket: Socket): LobbyHandler => {
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
    onRoomUpdate: (callback) => {
      onEvent(protocol.SocketEvents.ROOM_UPDATE, callback);
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
