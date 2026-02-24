import { Server } from "socket.io";

export type EmitToRoom = (roomId: string, event: string, payload?: unknown) => void;

export const createEmitToRoom = (io: Server): EmitToRoom => {
  return (roomId, event, payload) => {
    if (payload === undefined) {
      io.to(roomId).emit(event);
      return;
    }

    io.to(roomId).emit(event, payload);
  };
};
