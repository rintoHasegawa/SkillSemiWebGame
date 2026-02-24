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

export const createEmitToRoom = (io: Server) => {
  return (roomId: string, event: string, payload?: EmitPayload) => {
    emitWithOptionalPayload((eventName, body) => io.to(roomId).emit(eventName, body), event, payload);
  };
};

export const createEmitToSocket = (socket: Socket) => {
  return (event: string, payload?: EmitPayload) => {
    emitWithOptionalPayload((eventName, body) => socket.emit(eventName, body), event, payload);
  };
};

export const createEmitToAll = (io: Server) => {
  return (event: string, payload?: EmitPayload) => {
    emitWithOptionalPayload((eventName, body) => io.emit(eventName, body), event, payload);
  };
};
