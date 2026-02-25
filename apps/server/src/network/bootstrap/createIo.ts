/**
 * createIo
 * 共有設定を用いてSocket.IOサーバを生成する
 */
import { Server } from "socket.io";
import { config } from "@server/config";
import type { Server as HttpServer } from "http";

/** CORS設定を適用したSocket.IOサーバを生成する */
export const createIo = (httpServer: HttpServer) => {
  return new Server(httpServer, {
    cors: {
      origin: config.NETWORK_CONFIG.CORS_ORIGIN,
      methods: [...config.NETWORK_CONFIG.CORS_METHODS],
    },
  });
};
