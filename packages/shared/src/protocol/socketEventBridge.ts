/**
 * socketEventBridge
 * ソケットイベントの受信購読と送信を型安全に橋渡しする共通ブリッジを提供する
 */
type EventPayloadMap = Record<string, unknown>;

type EventNameOf<TPayloadMap extends EventPayloadMap> = Extract<keyof TPayloadMap, string>;

/** ソケットブリッジ生成に必要な最小インターフェース */
export type SocketBridgeTarget = {
  on: (event: string, callback: (payload: unknown) => void) => void;
  once: (event: string, callback: (payload: unknown) => void) => void;
  off: (event: string, callback: (payload: unknown) => void) => void;
  emit: (event: string, payload?: unknown) => void;
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
    socket.on(event, callback as (payload: unknown) => void);
  };

  const onceEvent = <TEvent extends EventNameOf<TInboundMap>>(
    event: TEvent,
    callback: (payload: TInboundMap[TEvent]) => void
  ) => {
    socket.once(event, callback as (payload: unknown) => void);
  };

  const offEvent = <TEvent extends EventNameOf<TInboundMap>>(
    event: TEvent,
    callback: (payload: TInboundMap[TEvent]) => void
  ) => {
    socket.off(event, callback as (payload: unknown) => void);
  };

  function emitEvent<TEvent extends EventNameOf<TOutboundMap>>(event: TEvent): void;
  function emitEvent<TEvent extends EventNameOf<TOutboundMap>>(event: TEvent, payload: TOutboundMap[TEvent]): void;
  function emitEvent<TEvent extends EventNameOf<TOutboundMap>>(event: TEvent, payload?: TOutboundMap[TEvent]): void {
    if (payload === undefined) {
      socket.emit(event);
      return;
    }

    socket.emit(event, payload as unknown);
  }

  return {
    onEvent,
    onceEvent,
    offEvent,
    emitEvent,
  };
};
