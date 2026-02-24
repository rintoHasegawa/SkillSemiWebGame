import { Server } from "socket.io";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomManager } from "@server/domains/room/RoomManager";
import { registerConnectionHandlers } from "./handlers/registerConnectionHandlers";

export class SocketManager {
  private io: Server;
  private gameManager: GameManager;
  private roomManager: RoomManager;

  constructor(io: Server, gameManager: GameManager, roomManager: RoomManager) {
    this.io = io;
    this.gameManager = gameManager;
    this.roomManager = roomManager;
  }

  public initialize() {
    registerConnectionHandlers({
      io: this.io,
      gameManager: this.gameManager,
      roomManager: this.roomManager,
    });
  }
}