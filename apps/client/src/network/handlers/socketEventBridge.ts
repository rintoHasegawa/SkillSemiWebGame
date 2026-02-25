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
  type ServerToClientEventPayloadMap,
} from "@repo/shared";

type ClientInboundEventPayloadMap =
  & ConnectionLifecycleEventPayloadMap
  & ServerToClientEventPayloadMap;

/** クライアント向けの型付きソケットイベント bridge を生成する */
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
