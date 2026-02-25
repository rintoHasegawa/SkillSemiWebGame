import type { Socket } from "socket.io";
import {
  createSocketEventBridge,
  type ClientToServerEventPayloadMap,
  type ServerToClientEventPayloadMap,
} from "@repo/shared";

export const createServerSocketOnBridge = (socket: Socket) => {
  const { onEvent, onceEvent } = createSocketEventBridge<
    ClientToServerEventPayloadMap,
    ServerToClientEventPayloadMap
  >(socket as any);

  return {
    onEvent,
    onceEvent,
  };
};
