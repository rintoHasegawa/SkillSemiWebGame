import type { Server as HttpServer } from "http";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { SocketManager } from "../SocketManager";
import { createIo } from "./createIo";

export const boot = (httpServer: HttpServer) => {
  const io = createIo(httpServer);
  const gameManager = new GameManager();
  const roomManager = new RoomManager();
  const socketManager = new SocketManager(io, gameManager, roomManager);

  socketManager.initialize();
};
