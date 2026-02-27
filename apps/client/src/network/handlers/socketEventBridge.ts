/**
 * socketEventBridge
 * クライアント向けソケットイベント bridge を生成する
 * 受信イベントと送信イベントの型境界を統一する
 */
import type { Socket } from "socket.io-client";
import {
  createSocketEventBridge,
  type ClientToServerEventPayloadMap,
  type ConnectionLifecycleEventPayloadMap,
  type SocketBridgeTarget,
  type ServerToClientEventPayloadMap,
} from "@repo/shared";

type ClientInboundEventPayloadMap =
  & ConnectionLifecycleEventPayloadMap
  & ServerToClientEventPayloadMap;

/** クライアント向けの型付きソケットイベント bridge を生成する */
export const createClientSocketEventBridge = (socket: Socket) => {
  const bridgeTarget: SocketBridgeTarget = {
    on: <TPayload>(event: string, callback: (payload: TPayload) => void) => {
      socket.on(event, callback as (payload: unknown) => void);
    },
    once: <TPayload>(event: string, callback: (payload: TPayload) => void) => {
      socket.once(event, callback as (payload: unknown) => void);
    },
    off: <TPayload>(event: string, callback: (payload: TPayload) => void) => {
      socket.off(event, callback as (payload: unknown) => void);
    },
    emit: (event: string, payload?: unknown) => {
      if (payload === undefined) {
        socket.emit(event);
        return;
      }

      socket.emit(event, payload);
    },
  };

  const { onEvent, onceEvent, offEvent, emitEvent } = createSocketEventBridge<
    ClientInboundEventPayloadMap,
    ClientToServerEventPayloadMap
  >(bridgeTarget);

  return {
    onEvent,
    onceEvent,
    offEvent,
    emitEvent,
  };
};
