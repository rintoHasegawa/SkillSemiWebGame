/**
 * LobbyHandler
 * ロビー画面で利用するソケット購読と送信を扱うハンドラ
 * ルーム更新購読とゲーム開始要求送信を提供する
 */
import type { Socket } from "socket.io-client";
import { contracts as protocol } from "@repo/shared";
import type { ServerToClientPayloadOf } from "@repo/shared";
import { createClientSocketEventBridge } from "./socketEventBridge";

/** ロビー画面で利用する通信操作の契約 */
type LobbyHandler = {
  onRoomUpdate: (
    callback: (
      room: ServerToClientPayloadOf<typeof protocol.SocketEvents.ROOM_UPDATE>,
    ) => void,
  ) => void;
  onceRoomUpdate: (
    callback: (
      room: ServerToClientPayloadOf<typeof protocol.SocketEvents.ROOM_UPDATE>,
    ) => void,
  ) => void;
  offRoomUpdate: (
    callback: (
      room: ServerToClientPayloadOf<typeof protocol.SocketEvents.ROOM_UPDATE>,
    ) => void,
  ) => void;
  startGame: (targetPlayerCount?: number) => void;
};

/** ロビー画面向けのソケットハンドラを生成する */
export const createLobbyHandler = (socket: Socket): LobbyHandler => {
  const { onEvent, onceEvent, offEvent, emitEvent } =
    createClientSocketEventBridge(socket);

  return {
    onRoomUpdate: (callback) => {
      onEvent(protocol.SocketEvents.ROOM_UPDATE, callback);
    },
    onceRoomUpdate: (callback) => {
      onceEvent(protocol.SocketEvents.ROOM_UPDATE, callback);
    },
    offRoomUpdate: (callback) => {
      offEvent(protocol.SocketEvents.ROOM_UPDATE, callback);
    },
    startGame: (targetPlayerCount) => {
      emitEvent(protocol.SocketEvents.START_GAME, {
        targetPlayerCount,
      });
    },
  };
};

/** ロビー画面向けの通信ハンドラ型を再公開 */
export type { LobbyHandler };
