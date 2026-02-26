/**
 * boot
 * HTTPサーバにSocket.IOと各マネージャを接続して起動準備を行う
 */
import type { Server as HttpServer } from "http";
import { RoomManager } from "@server/domains/room/RoomManager";
import { RoomGameRuntimeRegistry } from "@server/domains/room/application/services/RoomGameRuntimeRegistry";
import { SocketManager } from "../SocketManager";
import { createIo } from "./createIo";

/** 通信基盤とドメインマネージャを初期化して接続ハンドラを有効化する */
export const boot = (httpServer: HttpServer) => {
  // ネットワーク層とドメイン層の依存を構築する
  const io = createIo(httpServer);
  const roomManager = new RoomManager();
  const runtimeRegistry = new RoomGameRuntimeRegistry(roomManager);
  const socketManager = new SocketManager(io, roomManager, runtimeRegistry);

  socketManager.initialize();
};
