import { Server, Socket } from "socket.io";
import { RoomManager } from "@server/domains/room/RoomManager";
import { roomDisconnectUseCase } from "@server/domains/room/application/useCases/roomDisconnectUseCase";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";

export const handleRoomDisconnect = (
  io: Server,
  socket: Socket,
  roomManager: RoomManager
) => {
  roomDisconnectUseCase({
    roomManager,
    socketId: socket.id,
    emitToRoom: createEmitToRoom(io),
  });
};
