/**
 * roomDisconnectUseCase
 * 切断時のルーム退出処理と状態更新配信を行うユースケース
 */
import type {
  CleanupGameRuntimePort,
  DisconnectRoomPort,
} from "../ports/roomUseCasePorts";
import type { RoomOutputPort } from "../ports/roomUseCasePorts";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes, roomUseCaseLogEvents } from "@server/logging/index";

type RoomDisconnectUseCaseParams = {
  roomManager: DisconnectRoomPort;
  runtimeRegistry: CleanupGameRuntimePort;
  socketId: string;
  output: Pick<RoomOutputPort, "publishRoomUpdateToRoom">;
};

/** 切断ソケットを各ルームから退出させ，更新ルームを配信する */
export const roomDisconnectUseCase = ({
  roomManager,
  runtimeRegistry,
  socketId,
  output,
}: RoomDisconnectUseCaseParams) => {
  const { updatedRooms, deletedRoomIds } = roomManager.removePlayer(socketId);
  logEvent(logScopes.ROOM_USE_CASE, {
    event: roomUseCaseLogEvents.DISCONNECT,
    result: logResults.PROCESSED,
    socketId,
    updatedRoomCount: updatedRooms.length,
  });

  updatedRooms.forEach((room) => {
    output.publishRoomUpdateToRoom(room.roomId, room);
    logEvent(logScopes.ROOM_USE_CASE, {
      event: roomUseCaseLogEvents.ROOM_UPDATE,
      result: logResults.EMITTED,
      roomId: room.roomId,
      socketId,
      ownerId: room.ownerId,
      totalPlayers: room.players.length,
    });
  });

  deletedRoomIds.forEach((roomId) => {
    runtimeRegistry.cleanupGameManagerForRoom(roomId);
  });
};
