/**
 * SocketManager
 * サーバとの Socket.IO 接続を確立し，画面別ハンドラへ配る単一の入り口
 * ハンドシェイクではプロトコル版と，試合復帰用のセッショントークンを提示する
 */
import { io, Socket } from "socket.io-client";
import { contracts as protocol } from "@repo/shared";
import { config } from "@client/config";
import { loadOrCreateSessionToken } from "./sessionToken";
import { createCommonHandler, type CommonHandler } from "./handlers/CommonHandler";
import { createTitleHandler, type TitleHandler } from "./handlers/TitleHandler";
import { createLobbyHandler, type LobbyHandler } from "./handlers/LobbyHandler";
import { createGameHandler, type GameHandler } from "./handlers/GameHandler";
import {
  createGameSyncHandler,
  type GameSyncHandler,
} from "./handlers/GameSyncHandler";

/** 接続と画面別ハンドラをまとめて保持するソケット管理クラス */
export class SocketManager {
  public socket: Socket;
  public common: CommonHandler;
  public title: TitleHandler;
  public lobby: LobbyHandler;
  public game: GameHandler;
  public gameSync: GameSyncHandler;

  constructor() {
    const serverUrl = import.meta.env.PROD
      ? config.NETWORK_CONFIG.PROD_SERVER_URL
      : config.NETWORK_CONFIG.DEV_SERVER_URL;

    this.socket = io(serverUrl, {
      transports: [...config.NETWORK_CONFIG.SOCKET_TRANSPORTS],
      // 再接続のたびに評価させるため関数形式で渡し，最新のトークンを提示する
      auth: (cb) => {
        cb({
          // 版ずれのクライアントをサーバ側のハンドシェイクで検出させる
          protocolVersion: protocol.PROTOCOL_VERSION,
          // 一時的な切断からの試合復帰でサーバが席を照合するために使う
          sessionToken: loadOrCreateSessionToken(),
        });
      },
    });

    this.common = createCommonHandler(this.socket);
    this.title = createTitleHandler(this.socket);
    this.lobby = createLobbyHandler(this.socket);
    this.game = createGameHandler(this.socket);
    this.gameSync = createGameSyncHandler(this.socket);
  }
}

/** アプリ全体で共有するソケット管理インスタンス */
export const socketManager = new SocketManager();
