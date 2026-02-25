import type { Socket } from "socket.io";
import type { PayloadOf, SocketPayloadMap } from "@repo/shared";

type SocketEventName = Exclude<keyof SocketPayloadMap, "connect" | "disconnect">;

export const createServerSocketOnBridge = (socket: Socket) => {
  const onEvent = <TEvent extends SocketEventName>(
    event: TEvent,
    callback: (payload: PayloadOf<TEvent>) => void
  ) => {
    (socket as any).on(event, callback);
  };

  return {
    onEvent,
  };
};
