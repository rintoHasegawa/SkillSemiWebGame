/**
 * socketEventBridge
 * ソケットイベントの受信購読と送信を型安全に橋渡しする共通ブリッジを提供する
 */
type EventPayloadMap = Record<string, unknown>;

type EventNameOf<TPayloadMap extends EventPayloadMap> = Extract<keyof TPayloadMap, string>;

/** ソケットブリッジ生成に必要な最小インターフェース */
export type SocketBridgeTarget = {
  on: <TPayload>(event: string, callback: (payload: TPayload) => void) => void;
  once: <TPayload>(event: string, callback: (payload: TPayload) => void) => void;
  off: <TPayload>(event: string, callback: (payload: TPayload) => void) => void;
  emit: {
    (event: string): void;
    <TPayload>(event: string, payload: TPayload): void;
  };
};

/**
 * 受信・送信イベントの型マップを指定して，Socket.IOブリッジを生成する
 */
export const createSocketEventBridge = <
  TInboundMap extends EventPayloadMap,
  TOutboundMap extends EventPayloadMap,
>(socket: SocketBridgeTarget) => {
  const onEvent = <TEvent extends EventNameOf<TInboundMap>>(
    event: TEvent,
    callback: (payload: TInboundMap[TEvent]) => void
  ) => {
    socket.on<TInboundMap[TEvent]>(event, callback);
  };

  const onceEvent = <TEvent extends EventNameOf<TInboundMap>>(
    event: TEvent,
    callback: (payload: TInboundMap[TEvent]) => void
  ) => {
    socket.once<TInboundMap[TEvent]>(event, callback);
  };

  const offEvent = <TEvent extends EventNameOf<TInboundMap>>(
    event: TEvent,
    callback: (payload: TInboundMap[TEvent]) => void
  ) => {
    socket.off<TInboundMap[TEvent]>(event, callback);
  };

  function emitEvent<TEvent extends EventNameOf<TOutboundMap>>(event: TEvent): void;
  function emitEvent<TEvent extends EventNameOf<TOutboundMap>>(event: TEvent, payload: TOutboundMap[TEvent]): void;
  function emitEvent<TEvent extends EventNameOf<TOutboundMap>>(event: TEvent, payload?: TOutboundMap[TEvent]): void {
    if (payload === undefined) {
      socket.emit(event);
      return;
    }

    socket.emit<TOutboundMap[TEvent]>(event, payload);
  }

  return {
    onEvent,
    onceEvent,
    offEvent,
    emitEvent,
  };
};
