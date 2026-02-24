import { Server, Socket } from "socket.io";
import { RoomManager } from "@server/domains/room/RoomManager";
import { registerRoomHandlers as registerDomainRoomHandlers } from "@server/domains/room/RoomHandler";

export const registerRoomHandlers = (
  io: Server,
  socket: Socket,
  roomManager: RoomManager
) => {
  registerDomainRoomHandlers(io, socket, roomManager);
};
