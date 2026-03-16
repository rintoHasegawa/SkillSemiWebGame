/**
 * CommonHandler
 * 各ハンドラで共有する送信関数群を組み立てる
 */
import { Server, Socket } from "socket.io";
import {
  createEmitToAll,
  createEmitToRoom,
  createEmitToRoomExceptSocket,
  createEmitToSocket,
  createEmitToSocketById,
} from "@server/network/adapters/socketEmitters";

/** 到達保証を重視する送信関数群 */
export type ReliableEmitters = {
  emitToAll: ReturnType<typeof createEmitToAll>;
  emitToRoom: ReturnType<typeof createEmitToRoom>;
  emitToRoomExceptSocket: ReturnType<typeof createEmitToRoomExceptSocket>;
  emitToSocket: ReturnType<typeof createEmitToSocket>;
  emitToSocketById: ReturnType<typeof createEmitToSocketById>;
};

/** ハンドラで共通利用する送信コンテキスト */
export type CommonHandlerContext = {
  reliable: ReliableEmitters;
};

/** 送信先別のエミッタをまとめた共通コンテキストを生成する */
export const createCommonHandlerContext = (
  io: Server,
  socket: Socket
): CommonHandlerContext => {
  const reliable: ReliableEmitters = {
    emitToAll: createEmitToAll(io),
    emitToRoom: createEmitToRoom(io),
    emitToRoomExceptSocket: createEmitToRoomExceptSocket(io),
    emitToSocket: createEmitToSocket(socket),
    emitToSocketById: createEmitToSocketById(io),
  };

  return {
    reliable,
  };
};
