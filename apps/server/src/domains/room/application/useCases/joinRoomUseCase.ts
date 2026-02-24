/**
 * joinRoomUseCase
 * ルーム参加要求を処理し，状態更新を配信するユースケース
 */
import type { roomTypes } from "@repo/shared";
import type { JoinRoomPort, JoinRoomResult } from "../ports/roomUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type JoinRoomUseCaseParams = {
  roomManager: JoinRoomPort;
  socketId: string;
  data: roomTypes.JoinRoomPayload;
  publishRoomUpdate: (roomId: roomTypes.Room["roomId"], room: roomTypes.Room) => void;
};

/** 参加イベントを受け取り，ルーム更新を配信する */
export const joinRoomUseCase = ({
  roomManager,
  socketId,
  data,
  publishRoomUpdate,
}: JoinRoomUseCaseParams): JoinRoomResult => {
  const { roomId, playerName } = data;
  logEvent("RoomUseCase", {
    event: "JOIN_ROOM",
    result: "received",
    roomId,
    socketId,
    playerName,
  });

  const joinResult = roomManager.addPlayerToRoom(roomId, socketId, playerName);
  if (joinResult.status !== "joined") {
    logEvent("RoomUseCase", {
      event: "JOIN_ROOM",
      result: "rejected",
      reason: joinResult.status,
      roomId,
      socketId,
    });
    return joinResult;
  }

  publishRoomUpdate(roomId, joinResult.room);

  return joinResult;
};
