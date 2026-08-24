/**
 * CommonHandler
 * 接続イベントの購読と解除を扱う共通ハンドラを提供する
 * connect イベントをアプリ用の id 通知に変換し，disconnect を切断通知に変換する
 */
import type { Socket } from "socket.io-client";
import { contracts as protocol } from "@repo/shared";
import type { ConnectionLifecyclePayloadOf } from "@repo/shared";
import { createClientSocketEventBridge } from "./socketEventBridge";

/** 接続イベントを購読解除する共通ハンドラ契約 */
type CommonHandler = {
  onConnect: (callback: (id: string) => void) => void;
  offConnect: (callback: (id: string) => void) => void;
  onDisconnect: (callback: () => void) => void;
  offDisconnect: (callback: () => void) => void;
};

/** 接続イベント向けの共通ハンドラを生成する */
export const createCommonHandler = (socket: Socket): CommonHandler => {
  const connectListenerMap = new Map<
    (id: string) => void,
    (payload: ConnectionLifecyclePayloadOf<typeof protocol.SocketEvents.CONNECT>) => void
  >();

  const disconnectListenerMap = new Map<
    () => void,
    (payload: ConnectionLifecyclePayloadOf<typeof protocol.SocketEvents.DISCONNECT>) => void
  >();

  const { onEvent, offEvent } = createClientSocketEventBridge(socket);

  return {
    onConnect: (callback: (id: string) => void) => {
      if (socket.connected) {
        callback(socket.id || "");
      }

      const listener = (_payload: ConnectionLifecyclePayloadOf<typeof protocol.SocketEvents.CONNECT>) => {
        callback(socket.id || "");
      };

      connectListenerMap.set(callback, listener);
      onEvent(protocol.SocketEvents.CONNECT, listener);
    },
    offConnect: (callback: (id: string) => void) => {
      const listener = connectListenerMap.get(callback);
      if (!listener) return;

      offEvent(protocol.SocketEvents.CONNECT, listener);
      connectListenerMap.delete(callback);
    },
    onDisconnect: (callback: () => void) => {
      // 切断は登録時点の状態を問わずイベント発生時のみ通知する
      const listener = (_payload: ConnectionLifecyclePayloadOf<typeof protocol.SocketEvents.DISCONNECT>) => {
        callback();
      };

      disconnectListenerMap.set(callback, listener);
      onEvent(protocol.SocketEvents.DISCONNECT, listener);
    },
    offDisconnect: (callback: () => void) => {
      const listener = disconnectListenerMap.get(callback);
      if (!listener) return;

      offEvent(protocol.SocketEvents.DISCONNECT, listener);
      disconnectListenerMap.delete(callback);
    }
  };
};

/** 接続イベント向けの共通ハンドラ型を再公開 */
export type { CommonHandler };
