/**
 * createRoomOutputAdapter
 * ルーム系ユースケースから利用する送信関数を生成する
 */
import { Server } from "socket.io";
import { protocol } from "@repo/shared";
import type { roomTypes } from "@repo/shared";
import type { RoomOutputPort } from "@server/domains/room/application/ports/roomUseCasePorts";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";
import type { CommonHandlerContext } from "../CommonHandler";

type RoomId = roomTypes.Room["roomId"];
type RoomUpdatePayload = roomTypes.Room;

/** ルーム出力アダプターのインターフェース */
export type RoomOutputAdapter = RoomOutputPort;

/** 共通送信コンテキストからルーム出力アダプターを生成する */
export const createRoomOutputAdapter = (
  common: CommonHandlerContext
): RoomOutputAdapter => {
  return {
    publishRoomUpdateToRoom: (roomId: RoomId, room: RoomUpdatePayload) => {
      common.emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    },
    publishJoinRejectedToSocket: (payload: roomTypes.JoinRoomRejectedPayload) => {
      common.emitToSocket(protocol.SocketEvents.ROOM_JOIN_REJECTED, payload);
    },
  };
};

/** 切断時のルーム出力アダプターを生成する */
export const createRoomDisconnectOutputAdapter = (
  io: Server
): Pick<RoomOutputPort, "publishRoomUpdateToRoom"> => {
  const emitToRoom = createEmitToRoom(io);

  return {
    publishRoomUpdateToRoom: (roomId: RoomId, room: RoomUpdatePayload) => {
      emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    },
  };
};
