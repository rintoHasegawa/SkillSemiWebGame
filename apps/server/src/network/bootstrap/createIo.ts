/**
 * createIo
 * CORS許可オリジンを判定する関数を組み込んでSocket.IOサーバを生成する
 */
import { Server } from "socket.io";
import { config } from "@server/config";
import { logOriginRejected } from "@server/network/handlers/connectionEventLogger";
import type { Server as HttpServer } from "http";
import type { CorsPolicy } from "./corsPolicy";
import { isAllowedOrigin } from "./originPolicy";

/** 許可オリジン判定付きのCORS設定でSocket.IOサーバを生成する */
export const createIo = (httpServer: HttpServer, corsPolicy: CorsPolicy) => {
  return new Server(httpServer, {
    cors: {
      // 拒否時にコールバックへErrorを渡すことでWebSocketのハンドシェイクも遮断する
      origin: (origin, callback) => {
        const isAllowed = isAllowedOrigin(origin, corsPolicy.allowedOrigins, {
          isDevelopment: corsPolicy.isDevelopment,
        });

        if (isAllowed) {
          // trueを返して要求元のオリジンをそのまま許可応答に反映する
          callback(null, true);
          return;
        }

        logOriginRejected(origin ?? "");
        callback(new Error("CORS: 許可されていないオリジンからの接続"));
      },
      methods: [...config.NETWORK_CONFIG.CORS_METHODS],
    },
  });
};
