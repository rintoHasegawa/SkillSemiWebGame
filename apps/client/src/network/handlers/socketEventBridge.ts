/**
 * socketEventBridge
 * クライアント向けソケットイベント bridge を生成する
 * 受信イベントと送信イベントの型境界を統一する
 * 購読ペア・送信関数の生成ヘルパーもここに集約する
 */
import type { Socket } from "socket.io-client";
import {
  createSocketEventBridge,
  type ClientToServerEventPayloadMap,
  type ConnectionLifecycleEventPayloadMap,
  type SocketBridgeTarget,
  type ServerToClientEventPayloadMap,
} from "@repo/shared";

type ClientInboundEventPayloadMap =
  & ConnectionLifecycleEventPayloadMap
  & ServerToClientEventPayloadMap;

/** クライアント向けの型付きソケットイベント bridge を生成する */
export const createClientSocketEventBridge = (socket: Socket) => {
  const bridgeTarget: SocketBridgeTarget = {
    on: <TPayload>(event: string, callback: (payload: TPayload) => void) => {
      socket.on(event, callback as (payload: unknown) => void);
    },
    once: <TPayload>(event: string, callback: (payload: TPayload) => void) => {
      socket.once(event, callback as (payload: unknown) => void);
    },
    off: <TPayload>(event: string, callback: (payload: TPayload) => void) => {
      socket.off(event, callback as (payload: unknown) => void);
    },
    emit: (event: string, payload?: unknown) => {
      if (payload === undefined) {
        socket.emit(event);
        return;
      }

      socket.emit(event, payload);
    },
  };

  const { onEvent, onceEvent, offEvent, emitEvent } = createSocketEventBridge<
    ClientInboundEventPayloadMap,
    ClientToServerEventPayloadMap
  >(bridgeTarget);

  type ReceiveEventName = Extract<keyof ServerToClientEventPayloadMap, string>;
  type SendEventName = Extract<keyof ClientToServerEventPayloadMap, string>;

  /** 受信イベントの購読・購読解除をひとまとめにしたペアを生成する */
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

  /** ペイロードを伴う送信関数を生成する */
  const createPayloadSender = <TEvent extends SendEventName>(event: TEvent) => {
    return (payload: ClientToServerEventPayloadMap[TEvent]) => {
      emitEvent(event, payload);
    };
  };

  /** ペイロードを伴わない送信関数を生成する */
  const createVoidSender = <TEvent extends SendEventName>(event: TEvent) => {
    return () => {
      emitEvent(event);
    };
  };

  return {
    onEvent,
    onceEvent,
    offEvent,
    emitEvent,
    createSubscriptionPair,
    createPayloadSender,
    createVoidSender,
  };
};
