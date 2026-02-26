/**
 * CommonHandler
 * 各ハンドラで共有する送信関数群を組み立てる
 */
import { Server, Socket } from "socket.io";
import {
  createEmitToAll,
  createEmitToRoom,
  createEmitToSocket,
  createEmitToSocketById,
} from "@server/network/adapters/socketEmitters";

/** ハンドラで共通利用する送信コンテキスト */
export type CommonHandlerContext = {
  emitToAll: ReturnType<typeof createEmitToAll>;
  emitToRoom: ReturnType<typeof createEmitToRoom>;
  emitToSocket: ReturnType<typeof createEmitToSocket>;
  emitToSocketById: ReturnType<typeof createEmitToSocketById>;
};

/** 送信先別のエミッタをまとめた共通コンテキストを生成する */
export const createCommonHandlerContext = (
  io: Server,
  socket: Socket
): CommonHandlerContext => {
  return {
    emitToAll: createEmitToAll(io),
    emitToRoom: createEmitToRoom(io),
    emitToSocket: createEmitToSocket(socket),
    emitToSocketById: createEmitToSocketById(io),
  };
};
