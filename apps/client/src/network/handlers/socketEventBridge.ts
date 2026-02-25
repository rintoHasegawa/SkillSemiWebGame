import type { Socket } from "socket.io-client";
import {
  createSocketEventBridge,
  type ClientToServerEventPayloadMap,
  type ConnectionLifecycleEventPayloadMap,
  type ServerToClientEventPayloadMap,
} from "@repo/shared";

type ClientInboundEventPayloadMap =
  & ConnectionLifecycleEventPayloadMap
  & ServerToClientEventPayloadMap;

export const createClientSocketEventBridge = (socket: Socket) => {
  const { onEvent, onceEvent, offEvent, emitEvent } = createSocketEventBridge<
    ClientInboundEventPayloadMap,
    ClientToServerEventPayloadMap
  >(socket as any);

  return {
    onEvent,
    onceEvent,
    offEvent,
    emitEvent,
  };
};
