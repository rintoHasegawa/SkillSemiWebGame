/**
 * boot
 * HTTPサーバにSocket.IOと各マネージャを接続して起動準備を行う
 */
import type { Server as HttpServer } from "http";
import { GameManager } from "@server/domains/game/GameManager";
import { BombRoomStateStore } from "@server/domains/game/entities/bomb/BombRoomStateStore";
import { RoomManager } from "@server/domains/room/RoomManager";
import { SocketManager } from "../SocketManager";
import { createIo } from "./createIo";

/** 通信基盤とドメインマネージャを初期化して接続ハンドラを有効化する */
export const boot = (httpServer: HttpServer) => {
  // ネットワーク層とドメイン層の依存を構築する
  const io = createIo(httpServer);
  const gameManager = new GameManager();
  const bombState = new BombRoomStateStore();
  const roomManager = new RoomManager();
  const socketManager = new SocketManager(io, gameManager, bombState, roomManager);

  socketManager.initialize();
};
