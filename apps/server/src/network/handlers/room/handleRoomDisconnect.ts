import { Server, Socket } from "socket.io";
import { RoomManager } from "@server/domains/room/RoomManager";
import { handleRoomDisconnect as handleDomainRoomDisconnect } from "@server/domains/room/RoomHandler";

export const handleRoomDisconnect = (
  io: Server,
  socket: Socket,
  roomManager: RoomManager
) => {
  handleDomainRoomDisconnect(io, socket, roomManager);
};
