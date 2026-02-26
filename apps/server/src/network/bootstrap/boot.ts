/**
 * boot
 * HTTPサーバにSocket.IOと各マネージャを接続して起動準備を行う
 */
import type { Server as HttpServer } from "http";
import { createServerRuntime } from "./createServerRuntime";

/** 通信基盤とドメインマネージャを初期化して接続ハンドラを有効化する */
export const boot = (httpServer: HttpServer) => {
  // ネットワーク層とドメイン層の依存を構築する
  const { socketManager } = createServerRuntime(httpServer);

  socketManager.initialize();
};
