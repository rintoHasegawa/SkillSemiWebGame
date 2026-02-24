/**
 * roomDisconnectUseCase
 * 切断時のルーム退出処理と状態更新配信を行うユースケース
 */
import type { DisconnectRoomPort } from "../ports/roomUseCasePorts";
import type { RoomOutputPort } from "../ports/roomUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type RoomDisconnectUseCaseParams = {
  roomManager: DisconnectRoomPort;
  socketId: string;
  output: Pick<RoomOutputPort, "publishRoomUpdate">;
};

/** 切断ソケットを各ルームから退出させ，更新ルームを配信する */
export const roomDisconnectUseCase = ({
  roomManager,
  socketId,
  output,
}: RoomDisconnectUseCaseParams) => {
  const updatedRooms = roomManager.removePlayer(socketId);
  logEvent("RoomUseCase", {
    event: "DISCONNECT",
    result: "processed",
    socketId,
    updatedRoomCount: updatedRooms.length,
  });

  updatedRooms.forEach((room) => {
    output.publishRoomUpdate(room.roomId, room);
    logEvent("RoomUseCase", {
      event: "ROOM_UPDATE",
      result: "emitted",
      roomId: room.roomId,
      socketId,
      ownerId: room.ownerId,
      totalPlayers: room.players.length,
    });
  });
};
