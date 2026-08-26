/**
 * createServerRuntime
 * サーバー起動時に必要な依存オブジェクト群を組み立てる
 */
import type { Server as HttpServer } from "http";
import { RoomManager } from "@server/domains/room/RoomManager";
import { RoomGameRuntimeRegistry } from "@server/domains/room/application/services/RoomGameRuntimeRegistry";
import { SocketManager } from "@server/network/SocketManager";
import type { CorsPolicy } from "./corsPolicy";
import { createIo } from "./createIo";
import { createProtocolVersionGuard } from "./protocolVersionGuard";

/** 起動時に構築する実行コンテキスト */
type ServerRuntime = {
  socketManager: SocketManager;
};

/** HTTPサーバーとCORS設定から実行コンテキストを構築する */
export const createServerRuntime = (
  httpServer: HttpServer,
  corsPolicy: CorsPolicy,
): ServerRuntime => {
  const io = createIo(httpServer, corsPolicy);
  // 版ずれのクライアントはハンドシェイク時点で拒否する
  io.use(createProtocolVersionGuard());
  const roomManager = new RoomManager();
  const runtimeRegistry = new RoomGameRuntimeRegistry(roomManager);
  const socketManager = new SocketManager(io, roomManager, runtimeRegistry);

  return {
    socketManager,
  };
};
