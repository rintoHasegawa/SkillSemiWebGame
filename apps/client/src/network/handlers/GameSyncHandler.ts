/**
 * GameSyncHandler
 * ゲーム中の時刻同期ソケット操作を提供する
 * PING送信とPONG購読をゲーム操作APIから分離する
 */
import type { Socket } from "socket.io-client";
import { contracts as protocol } from "@repo/shared";
import type { PongPayload } from "@repo/shared";
import { createClientSocketEventBridge } from "./socketEventBridge";

/** 時刻同期向けソケット操作の契約 */
export type GameSyncHandler = {
  onPong: (callback: (payload: PongPayload) => void) => void;
  offPong: (callback: (payload: PongPayload) => void) => void;
  sendPing: (clientTime: number) => void;
};

/** ソケットインスタンスから時刻同期向けハンドラを生成する */
export const createGameSyncHandler = (socket: Socket): GameSyncHandler => {
  const { createSubscriptionPair, createPayloadSender } =
    createClientSocketEventBridge(socket);

  const pongSubscription = createSubscriptionPair(protocol.SocketEvents.PONG);
  const sendPingPayload = createPayloadSender(protocol.SocketEvents.PING);

  return {
    onPong: (callback) => {
      pongSubscription.on(callback);
    },
    offPong: (callback) => {
      pongSubscription.off(callback);
    },
    sendPing: (clientTime) => {
      sendPingPayload(clientTime);
    },
  };
};
