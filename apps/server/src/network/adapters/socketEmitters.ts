/**
 * socketEmitters
 * Socket.IOの送信処理を用途別に生成するアダプタ
 */
import { Server, Socket } from "socket.io";

type EmitPayload = unknown;

const emitWithOptionalPayload = (
  emit: (event: string, payload?: EmitPayload) => void,
  event: string,
  payload?: EmitPayload
) => {
  if (payload === undefined) {
    emit(event);
    return;
  }

  emit(event, payload);
};

/** ルーム単位の送信関数を生成する */
export const createEmitToRoom = (io: Server) => {
  return (roomId: string, event: string, payload?: EmitPayload) => {
    emitWithOptionalPayload((eventName, body) => io.to(roomId).emit(eventName, body), event, payload);
  };
};

/** 単一ソケット向けの送信関数を生成する */
export const createEmitToSocket = (socket: Socket) => {
  return (event: string, payload?: EmitPayload) => {
    emitWithOptionalPayload((eventName, body) => socket.emit(eventName, body), event, payload);
  };
};

/** 全接続向けの送信関数を生成する */
export const createEmitToAll = (io: Server) => {
  return (event: string, payload?: EmitPayload) => {
    emitWithOptionalPayload((eventName, body) => io.emit(eventName, body), event, payload);
  };
};
