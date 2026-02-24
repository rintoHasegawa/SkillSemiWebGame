/**
 * createRoomEventPublisher
 * ルーム系ユースケースから利用する送信関数を生成する
 */
import { Server } from "socket.io";
import { protocol } from "@repo/shared";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";
import type { roomTypes } from "@repo/shared";
import type { CommonHandlerContext } from "../CommonHandler";

type RoomId = roomTypes.Room["roomId"];
type RoomUpdatePayload = roomTypes.Room;

/** ルーム更新イベントの送信インターフェース */
export type RoomEventPublisher = {
  publishRoomUpdate: (roomId: RoomId, room: RoomUpdatePayload) => void;
  publishJoinRejected: (payload: roomTypes.JoinRoomRejectedPayload) => void;
};

/** 共通送信コンテキストからルームイベント送信関数を生成する */
export const createRoomEventPublisher = (
  common: CommonHandlerContext
): RoomEventPublisher => {
  return {
    publishRoomUpdate: (roomId: RoomId, room: RoomUpdatePayload) => {
      common.emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    },
    publishJoinRejected: (payload: roomTypes.JoinRoomRejectedPayload) => {
      common.emitToSocket(protocol.SocketEvents.ROOM_JOIN_REJECTED, payload);
    },
  };
};

/** 切断時のルーム更新送信関数を生成する */
export const createRoomDisconnectPublisher = (io: Server): RoomEventPublisher => {
  const emitToRoom = createEmitToRoom(io);

  return {
    publishRoomUpdate: (roomId: RoomId, room: RoomUpdatePayload) => {
      emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    },
    publishJoinRejected: () => {
      return;
    },
  };
};
