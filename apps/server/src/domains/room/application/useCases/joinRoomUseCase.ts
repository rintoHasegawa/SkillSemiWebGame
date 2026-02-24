/**
 * joinRoomUseCase
 * ルーム参加要求を処理し，状態更新を配信するユースケース
 */
import type { roomTypes } from "@repo/shared";
import type {
  JoinRoomPort,
  JoinRoomResult,
  RoomOutputPort,
} from "../ports/roomUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type JoinRoomUseCaseParams = {
  roomManager: JoinRoomPort;
  socketId: string;
  data: roomTypes.JoinRoomPayload;
  output: Pick<RoomOutputPort, "publishJoinRejectedToSocket">;
};

/** 参加イベントを受け取り，参加可否を判定する */
export const joinRoomUseCase = ({
  roomManager,
  socketId,
  data,
  output,
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
    output.publishJoinRejectedToSocket({
      roomId,
      reason: joinResult.status,
    });

    logEvent("RoomUseCase", {
      event: "JOIN_ROOM",
      result: "rejected",
      reason: joinResult.status,
      roomId,
      socketId,
    });
    return joinResult;
  }

  return joinResult;
};
