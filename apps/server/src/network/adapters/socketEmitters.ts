/**
 * socketEmitters
 * Socket.IOの送信処理を用途別に生成するアダプタ
 */
import { Server, Socket } from "socket.io";
import type {
  ServerToClientEventPayloadMap,
  ServerToClientPayloadOf,
} from "@repo/shared";

type SocketEventName = keyof ServerToClientEventPayloadMap;

type EmitToRoom = {
  <TEvent extends SocketEventName>(roomId: string, event: TEvent): void;
  <TEvent extends SocketEventName>(roomId: string, event: TEvent, payload: ServerToClientPayloadOf<TEvent>): void;
};

type EmitToSocket = {
  <TEvent extends SocketEventName>(event: TEvent): void;
  <TEvent extends SocketEventName>(event: TEvent, payload: ServerToClientPayloadOf<TEvent>): void;
};

type EmitToAll = {
  <TEvent extends SocketEventName>(event: TEvent): void;
  <TEvent extends SocketEventName>(event: TEvent, payload: ServerToClientPayloadOf<TEvent>): void;
};

/** ペイロード有無に応じて emit 呼び出しシグネチャを切り替える共通関数 */
const emitWithOptionalPayload = (
  emit: (event: SocketEventName, payload?: unknown) => void,
  event: SocketEventName,
  payload?: unknown
) => {
  if (payload === undefined) {
    emit(event);
    return;
  }

  emit(event, payload);
};

/** ルーム単位の送信関数を生成する */
export const createEmitToRoom = (io: Server): EmitToRoom => {
  return (roomId: string, event: SocketEventName, payload?: unknown) => {
    emitWithOptionalPayload((eventName, body) => io.to(roomId).emit(eventName, body), event, payload);
  };
};

/** 単一ソケット向けの送信関数を生成する */
export const createEmitToSocket = (socket: Socket): EmitToSocket => {
  return (event: SocketEventName, payload?: unknown) => {
    emitWithOptionalPayload((eventName, body) => socket.emit(eventName, body), event, payload);
  };
};

/** 全接続向けの送信関数を生成する */
export const createEmitToAll = (io: Server): EmitToAll => {
  return (event: SocketEventName, payload?: unknown) => {
    emitWithOptionalPayload((eventName, body) => io.emit(eventName, body), event, payload);
  };
};
