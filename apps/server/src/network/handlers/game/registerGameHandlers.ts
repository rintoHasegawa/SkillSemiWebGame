import { Server, Socket } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { registerGameHandlers as registerDomainGameHandlers } from "@server/domains/game/GameHandler";

export const registerGameHandlers = (
  io: Server,
  socket: Socket,
  gameManager: GameManager,
  roomManager: RoomManager
) => {
  registerDomainGameHandlers(io, socket, gameManager, roomManager);
};
