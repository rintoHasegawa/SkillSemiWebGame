/**
 * TitleHandler
 * タイトル画面で利用する参加要求送信と拒否購読を扱うハンドラ
 * ルーム参加フローの送受信イベントを集約する
 */
import type { Socket } from "socket.io-client";
import { contracts as protocol } from "@repo/shared";
import type { ClientToServerPayloadOf, ServerToClientPayloadOf } from "@repo/shared";
import { createClientSocketEventBridge } from "./socketEventBridge";

/** タイトル画面で利用する通信操作の契約 */
type TitleHandler = {
  joinRoom: (payload: ClientToServerPayloadOf<typeof protocol.SocketEvents.JOIN_ROOM>) => void;
  onJoinRejected: (callback: (payload: ServerToClientPayloadOf<typeof protocol.SocketEvents.ROOM_JOIN_REJECTED>) => void) => void;
  onceJoinRejected: (callback: (payload: ServerToClientPayloadOf<typeof protocol.SocketEvents.ROOM_JOIN_REJECTED>) => void) => void;
  offJoinRejected: (callback: (payload: ServerToClientPayloadOf<typeof protocol.SocketEvents.ROOM_JOIN_REJECTED>) => void) => void;
};

/** タイトル画面向けのソケットハンドラを生成する */
export const createTitleHandler = (socket: Socket): TitleHandler => {
  const { onEvent, onceEvent, offEvent, emitEvent } = createClientSocketEventBridge(socket);

  return {
    joinRoom: (payload) => {
      emitEvent(protocol.SocketEvents.JOIN_ROOM, payload);
    },
    onJoinRejected: (callback) => {
      onEvent(protocol.SocketEvents.ROOM_JOIN_REJECTED, callback);
    },
    onceJoinRejected: (callback) => {
      onceEvent(protocol.SocketEvents.ROOM_JOIN_REJECTED, callback);
    },
    offJoinRejected: (callback) => {
      offEvent(protocol.SocketEvents.ROOM_JOIN_REJECTED, callback);
    }
  };
};

/** タイトル画面向けの通信ハンドラ型を再公開 */
export type { TitleHandler };
