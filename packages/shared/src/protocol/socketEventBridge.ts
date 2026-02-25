type EventPayloadMap = Record<string, unknown>;

type EventNameOf<TPayloadMap extends EventPayloadMap> = Extract<keyof TPayloadMap, string>;

type SocketBridgeTarget = {
  on: (event: string, callback: (payload: unknown) => void) => void;
  once: (event: string, callback: (payload: unknown) => void) => void;
  off: (event: string, callback: (payload: unknown) => void) => void;
  emit: (event: string, payload?: unknown) => void;
};

/**
 * 受信・送信イベントの型マップを指定して、Socket.IOブリッジを生成する
 */
export const createSocketEventBridge = <
  TInboundMap extends EventPayloadMap,
  TOutboundMap extends EventPayloadMap,
>(socket: SocketBridgeTarget) => {
  const onEvent = <TEvent extends EventNameOf<TInboundMap>>(
    event: TEvent,
    callback: (payload: TInboundMap[TEvent]) => void
  ) => {
    (socket as any).on(event, callback);
  };

  const onceEvent = <TEvent extends EventNameOf<TInboundMap>>(
    event: TEvent,
    callback: (payload: TInboundMap[TEvent]) => void
  ) => {
    (socket as any).once(event, callback);
  };

  const offEvent = <TEvent extends EventNameOf<TInboundMap>>(
    event: TEvent,
    callback: (payload: TInboundMap[TEvent]) => void
  ) => {
    (socket as any).off(event, callback);
  };

  function emitEvent<TEvent extends EventNameOf<TOutboundMap>>(event: TEvent): void;
  function emitEvent<TEvent extends EventNameOf<TOutboundMap>>(event: TEvent, payload: TOutboundMap[TEvent]): void;
  function emitEvent<TEvent extends EventNameOf<TOutboundMap>>(event: TEvent, payload?: TOutboundMap[TEvent]): void {
    if (payload === undefined) {
      (socket as any).emit(event);
      return;
    }

    (socket as any).emit(event, payload);
  }

  return {
    onEvent,
    onceEvent,
    offEvent,
    emitEvent,
  };
};
