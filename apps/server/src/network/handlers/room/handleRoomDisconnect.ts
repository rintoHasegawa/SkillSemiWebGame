import { Server, Socket } from "socket.io";
import { RoomManager } from "@server/domains/room/RoomManager";
import { protocol } from "@repo/shared";
import { roomDisconnectUseCase } from "@server/domains/room/application/useCases/roomDisconnectUseCase";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";

export const handleRoomDisconnect = (
  io: Server,
  socket: Socket,
  roomManager: RoomManager
) => {
  const emitToRoom = createEmitToRoom(io);

  roomDisconnectUseCase({
    roomManager,
    socketId: socket.id,
    publishRoomUpdate: (roomId, room) => {
      emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    },
  });
};
