import { Server } from "socket.io";
import { config } from "@repo/shared";
import type { Server as HttpServer } from "http";

export const createIo = (httpServer: HttpServer) => {
  return new Server(httpServer, {
    cors: {
      origin: config.NETWORK_CONFIG.CORS_ORIGIN,
      methods: [...config.NETWORK_CONFIG.CORS_METHODS],
    },
  });
};
