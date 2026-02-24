import { Server, Socket } from "socket.io";
import {
  createEmitToAll,
  createEmitToRoom,
  createEmitToSocket,
} from "@server/network/adapters/socketEmitters";

export type CommonHandlerContext = {
  emitToAll: ReturnType<typeof createEmitToAll>;
  emitToRoom: ReturnType<typeof createEmitToRoom>;
  emitToSocket: ReturnType<typeof createEmitToSocket>;
};

export const createCommonHandlerContext = (
  io: Server,
  socket: Socket
): CommonHandlerContext => {
  return {
    emitToAll: createEmitToAll(io),
    emitToRoom: createEmitToRoom(io),
    emitToSocket: createEmitToSocket(socket),
  };
};
