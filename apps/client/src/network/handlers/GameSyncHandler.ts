/**
 * GameSyncHandler
 * ゲーム中の時刻同期ソケット操作を提供する
 * PING送信とPONG購読をゲーム操作APIから分離する
 */
import type { Socket } from "socket.io-client";
import { contracts as protocol } from "@repo/shared";
import type {
  ClientToServerEventPayloadMap,
  PongPayload,
  ServerToClientEventPayloadMap,
} from "@repo/shared";
import { createClientSocketEventBridge } from "./socketEventBridge";

/** 時刻同期向けソケット操作の契約 */
export type GameSyncHandler = {
  onPong: (callback: (payload: PongPayload) => void) => void;
  offPong: (callback: (payload: PongPayload) => void) => void;
  sendPing: (clientTime: number) => void;
};

/** ソケットインスタンスから時刻同期向けハンドラを生成する */
export const createGameSyncHandler = (socket: Socket): GameSyncHandler => {
  const { onEvent, offEvent, emitEvent } = createClientSocketEventBridge(socket);
  type ReceiveEventName = Extract<keyof ServerToClientEventPayloadMap, string>;
  type SendEventName = Extract<keyof ClientToServerEventPayloadMap, string>;

  const createSubscriptionPair = <TEvent extends ReceiveEventName>(
    event: TEvent,
  ) => {
    return {
      on: (
        callback: (payload: ServerToClientEventPayloadMap[TEvent]) => void,
      ) => {
        onEvent(event, callback);
      },
      off: (
        callback: (payload: ServerToClientEventPayloadMap[TEvent]) => void,
      ) => {
        offEvent(event, callback);
      },
    };
  };

  const createPayloadSender = <TEvent extends SendEventName>(event: TEvent) => {
    return (payload: ClientToServerEventPayloadMap[TEvent]) => {
      emitEvent(event, payload);
    };
  };

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
