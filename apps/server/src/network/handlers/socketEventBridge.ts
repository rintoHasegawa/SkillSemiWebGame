/**
 * socketEventBridge
 * サーバー向けソケットイベント bridge を生成する
 * クライアント受信イベントを型安全に購読する入口を提供する
 */
import type { Socket } from "socket.io";
import {
  createSocketEventBridge,
  type ClientToServerEventPayloadMap,
  type SocketBridgeTarget,
  type ServerToClientEventPayloadMap,
} from "@repo/shared";

/** サーバー向けの型付きソケットイベント bridge を生成する */
export const createServerSocketOnBridge = (socket: Socket) => {
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

  const { onEvent, onceEvent } = createSocketEventBridge<
    ClientToServerEventPayloadMap,
    ServerToClientEventPayloadMap
  >(bridgeTarget);

  return {
    onEvent,
    onceEvent,
  };
};
