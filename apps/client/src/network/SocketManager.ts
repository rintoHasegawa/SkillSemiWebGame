import { io, Socket } from "socket.io-client";
import { config } from "@repo/shared";
import { createCommonHandler, type CommonHandler } from "./handlers/CommonHandler";
import { createTitleHandler, type TitleHandler } from "./handlers/TitleHandler";
import { createLobbyHandler, type LobbyHandler } from "./handlers/LobbyHandler";
import { createGameHandler, type GameHandler } from "./handlers/GameHandler";

export class SocketManager {
  public socket: Socket;
  public common: CommonHandler;
  public title: TitleHandler;
  public lobby: LobbyHandler;
  public game: GameHandler;

  constructor() {
    const serverUrl = import.meta.env.PROD
      ? config.NETWORK_CONFIG.PROD_SERVER_URL
      : config.NETWORK_CONFIG.DEV_SERVER_URL;

    this.socket = io(serverUrl, {
      transports: [...config.NETWORK_CONFIG.SOCKET_TRANSPORTS],
      withCredentials: true
    });

    this.common = createCommonHandler(this.socket);
    this.title = createTitleHandler(this.socket);
    this.lobby = createLobbyHandler(this.socket);
    this.game = createGameHandler(this.socket);
  }
}

export const socketManager = new SocketManager();
