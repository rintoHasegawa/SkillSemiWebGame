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

/** サーバー向けの型付きソケットイベント bridge を生成する */
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
