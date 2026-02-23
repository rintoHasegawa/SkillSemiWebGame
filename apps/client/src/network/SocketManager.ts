import { io, Socket } from "socket.io-client";
import { config } from "@repo/shared";
import { createConnectionHandler, type ConnectionHandler } from "./handlers/ConnectionHandler";
import { createRoomHandler, type RoomHandler } from "./handlers/RoomHandler";
import { createGameHandler, type GameHandler } from "./handlers/GameHandler";

export class SocketManager {
  public socket: Socket;
  public connection: ConnectionHandler;
  public room: RoomHandler;
  public game: GameHandler;

  constructor() {
    const serverUrl = import.meta.env.PROD
      ? config.NETWORK_CONFIG.PROD_SERVER_URL
      : config.NETWORK_CONFIG.DEV_SERVER_URL;

    this.socket = io(serverUrl, {
      transports: [...config.NETWORK_CONFIG.SOCKET_TRANSPORTS],
      withCredentials: true
    });

    this.connection = createConnectionHandler(this.socket);
    this.room = createRoomHandler(this.socket);
    this.game = createGameHandler(this.socket);
  }
}

export const socketManager = new SocketManager();
