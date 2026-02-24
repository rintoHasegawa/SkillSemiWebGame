import { Server, Socket } from "socket.io";
import { RoomManager } from "@server/domains/room/RoomManager";
import { roomDisconnectUseCase } from "@server/domains/room/application/useCases/roomDisconnectUseCase";
import { createRoomDisconnectPublisher } from "./createRoomEventPublisher";

export const handleRoomDisconnect = (
  io: Server,
  socket: Socket,
  roomManager: RoomManager
) => {
  const roomDisconnectPublisher = createRoomDisconnectPublisher(io);

  roomDisconnectUseCase({
    roomManager,
    socketId: socket.id,
    publishRoomUpdate: roomDisconnectPublisher.publishRoomUpdate,
  });
};
