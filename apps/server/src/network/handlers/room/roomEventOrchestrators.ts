/**
 * roomEventOrchestrators
 * ルーム受信イベントごとの調停処理を提供する
 * 受信ハンドラからユースケース実行責務を分離する
 * 本ファイルではランタイム未解決ログ対象イベントを扱わない
 */
import type { roomTypes } from "@repo/shared";
import { joinRoomUseCase } from "@server/domains/room/application/useCases/joinRoomUseCase";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes, roomUseCaseLogEvents } from "@server/logging/index";
import type {
  JoinRoomEventRoomUseCasePort,
  JoinRoomEventRuntimeUseCasePort,
} from "@server/network/types/connectionPorts";
import type { RoomOutputAdapter } from "./createRoomOutputAdapter";

/** JOIN_ROOMイベント調停で利用する依存集合 */
export type JoinRoomOrchestratorDeps = {
  socketId: string;
  roomManager: JoinRoomEventRoomUseCasePort;
  runtimeRegistry: JoinRoomEventRuntimeUseCasePort;
  output: RoomOutputAdapter;
  joinRoom: (roomId: string) => Promise<void>;
};

/** JOIN_ROOMイベントを調停して参加ユースケースを実行する */
export const handleJoinRoomEvent = async (
  deps: JoinRoomOrchestratorDeps,
  payload: roomTypes.JoinRoomPayload,
): Promise<void> => {
  const joinResult = joinRoomUseCase({
    roomManager: deps.roomManager,
    runtimeRegistry: deps.runtimeRegistry,
    socketId: deps.socketId,
    data: payload,
    output: deps.output,
  });

  switch (joinResult.status) {
    case "full":
      logEvent(logScopes.NETWORK, {
        event: roomUseCaseLogEvents.JOIN_ROOM,
        result: logResults.REJECTED_ROOM_FULL,
        roomId: payload.roomId,
        socketId: deps.socketId,
      });
      return;

    case "duplicate":
      logEvent(logScopes.NETWORK, {
        event: roomUseCaseLogEvents.JOIN_ROOM,
        result: logResults.REJECTED_DUPLICATE,
        roomId: payload.roomId,
        socketId: deps.socketId,
      });
      return;

    case "joined":
      await deps.joinRoom(payload.roomId);
      deps.output.publishRoomUpdateToRoom(payload.roomId, joinResult.room);
      logEvent(logScopes.ROOM_USE_CASE, {
        event: roomUseCaseLogEvents.ROOM_UPDATE,
        result: logResults.EMITTED,
        roomId: payload.roomId,
        socketId: deps.socketId,
        ownerId: joinResult.room.ownerId,
        totalPlayers: joinResult.room.players.length,
      });
      return;

    default:
      return;
  }
};
