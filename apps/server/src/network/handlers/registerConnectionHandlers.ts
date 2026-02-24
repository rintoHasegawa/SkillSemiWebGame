import { Server, Socket } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { protocol } from "@repo/shared";
import { registerRoomHandlers, handleRoomDisconnect } from "./RoomHandler";
import { registerGameHandlers, handleGameDisconnect } from "./GameHandler";
import { logEvent } from "@server/logging/logEvent";

type RegisterConnectionHandlersParams = {
  io: Server;
  gameManager: GameManager;
  roomManager: RoomManager;
};

export const registerConnectionHandlers = ({
  io,
  gameManager,
  roomManager,
}: RegisterConnectionHandlersParams) => {
  io.on(protocol.SocketEvents.CONNECT, (socket: Socket) => {
    logEvent("Network", {
      event: "CONNECT",
      result: "connected",
      socketId: socket.id,
    });

    registerRoomHandlers(io, socket, roomManager);
    registerGameHandlers(io, socket, gameManager, roomManager);

    socket.on(protocol.SocketEvents.DISCONNECT, () => {
      logEvent("Network", {
        event: "DISCONNECT",
        result: "disconnected",
        socketId: socket.id,
      });

      handleGameDisconnect(io, gameManager, socket.id);
      handleRoomDisconnect(io, socket, roomManager);
    });
  });
};
