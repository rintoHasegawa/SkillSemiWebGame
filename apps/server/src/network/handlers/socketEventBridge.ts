/**
 * socketEventBridge
 * サーバー向けソケットイベント bridge を生成する
 * クライアント受信イベントを型安全に購読する入口を提供する
 */
import type { Socket } from "socket.io";
import {
  createSocketEventBridge,
  type ClientToServerEventPayloadMap,
  type ServerToClientEventPayloadMap,
} from "@repo/shared";

type BridgeTarget = {
  on: (event: string, callback: (payload: unknown) => void) => void;
  once: (event: string, callback: (payload: unknown) => void) => void;
  off: (event: string, callback: (payload: unknown) => void) => void;
  emit: (event: string, payload?: unknown) => void;
};

/** サーバー向けの型付きソケットイベント bridge を生成する */
export const createServerSocketOnBridge = (socket: Socket) => {
  const bridgeTarget: BridgeTarget = {
    on: (event, callback) => {
      socket.on(event, callback);
    },
    once: (event, callback) => {
      socket.once(event, callback);
    },
    off: (event, callback) => {
      socket.off(event, callback);
    },
    emit: (event, payload) => {
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
