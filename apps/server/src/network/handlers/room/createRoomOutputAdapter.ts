/**
 * createRoomOutputAdapter
 * ルーム系ユースケースから利用する送信関数を生成する
 */
import { Server } from "socket.io";
import { contracts as protocol } from "@repo/shared";
import { domain } from "@repo/shared";
import type { RoomOutputPort } from "@server/domains/room/application/ports/roomUseCasePorts";
import {
  createCloseRoomChannel,
  createEmitToRoom,
} from "@server/network/adapters/socketEmitters";
import type { CommonHandlerContext } from "../CommonHandler";

type RoomId = domain.room.Room["roomId"];
type RoomUpdatePayload = domain.room.Room;

/** ルーム出力アダプターのインターフェース */
export type RoomOutputAdapter = RoomOutputPort;

/** 共通送信コンテキストからルーム出力アダプターを生成する */
export const createRoomOutputAdapter = (
  common: CommonHandlerContext,
  io: Server
): RoomOutputAdapter => {
  const { reliable } = common;
  const closeRoomChannel = createCloseRoomChannel(io);

  return {
    publishRoomUpdateToRoom: (roomId: RoomId, room: RoomUpdatePayload) => {
      reliable.emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    },
    publishJoinRejectedToSocket: (payload: domain.room.JoinRoomRejectedPayload) => {
      reliable.emitToSocket(protocol.SocketEvents.ROOM_JOIN_REJECTED, payload);
    },
    publishSelectTeamRejectedToSocket: (teamId: number) => {
      reliable.emitToSocket(protocol.SocketEvents.SELECT_TEAM_REJECTED, {
        preferredTeamId: teamId,
        reason: "team_full" as const,
      });
    },
    closeRoomChannel: (roomId: RoomId) => {
      closeRoomChannel(roomId);
    },
  };
};

/** 切断時のルーム出力アダプターを生成する */
export const createRoomDisconnectOutputAdapter = (
  io: Server
): Pick<RoomOutputPort, "publishRoomUpdateToRoom" | "closeRoomChannel"> => {
  const emitToRoom = createEmitToRoom(io);
  const closeRoomChannel = createCloseRoomChannel(io);

  return {
    publishRoomUpdateToRoom: (roomId: RoomId, room: RoomUpdatePayload) => {
      emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
    },
    closeRoomChannel: (roomId: RoomId) => {
      closeRoomChannel(roomId);
    },
  };
};
