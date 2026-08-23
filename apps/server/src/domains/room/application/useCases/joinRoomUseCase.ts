/**
 * joinRoomUseCase
 * ルーム参加要求を処理し，状態更新を配信するユースケース
 */
import { domain } from "@repo/shared";
import type {
  EnsureGameRuntimePort,
  JoinRoomPort,
  JoinRoomResult,
  RoomOutputPort,
} from "../ports/roomUseCasePorts";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes, roomUseCaseLogEvents } from "@server/logging/index";

type JoinRoomUseCaseParams = {
  roomManager: JoinRoomPort;
  runtimeRegistry: EnsureGameRuntimePort;
  socketId: string;
  data: domain.room.JoinRoomPayload;
  output: Pick<RoomOutputPort, "publishJoinRejectedToSocket">;
};

/** 参加イベントを受け取り，参加可否を判定する */
export const joinRoomUseCase = ({
  roomManager,
  runtimeRegistry,
  socketId,
  data,
  output,
}: JoinRoomUseCaseParams): JoinRoomResult => {
  // 入力の前後空白は意味を持たないため正規化し，同名ルームが空白差で分裂するのを防ぐ
  const roomId = data.roomId.trim();
  const playerName = data.playerName.trim();
  logEvent(logScopes.ROOM_USE_CASE, {
    event: roomUseCaseLogEvents.JOIN_ROOM,
    result: logResults.RECEIVED,
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

    logEvent(logScopes.ROOM_USE_CASE, {
      event: roomUseCaseLogEvents.JOIN_ROOM,
      result: logResults.REJECTED,
      reason: joinResult.status,
      roomId,
      socketId,
    });
    return joinResult;
  }

  runtimeRegistry.ensureGameManagerForRoom(roomId);

  return joinResult;
};
