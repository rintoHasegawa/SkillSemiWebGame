/**
 * registerRoomHandlers
 * ルーム参加イベントの受信ハンドラを登録する
 */
import { Server, Socket } from "socket.io";
import { protocol } from "@repo/shared";
import type {
  EnsureGameRuntimePort,
  JoinRoomPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import { joinRoomUseCase } from "@server/domains/room/application/useCases/joinRoomUseCase";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes } from "@server/logging/index";
import { createCommonHandlerContext } from "@server/network/handlers/CommonHandler";
import { createPayloadGuard } from "@server/network/handlers/payloadGuard";
import { createServerSocketOnBridge } from "@server/network/handlers/socketEventBridge";
import { isJoinRoomPayload } from "@server/network/validation/socketPayloadValidators";
import { createRoomOutputAdapter } from "./createRoomOutputAdapter";

/** ルーム受信イベントごとの入力検証関数を保持するテーブル */
const roomPayloadValidators = {
  [protocol.SocketEvents.JOIN_ROOM]: isJoinRoomPayload,
} as const;

/** ルーム参加イベントを検証して参加ユースケースへ連携する */
export const registerRoomHandlers = (
  io: Server,
  socket: Socket,
  roomManager: JoinRoomPort,
  runtimeRegistry: EnsureGameRuntimePort
) => {
  const common = createCommonHandlerContext(io, socket);
  const roomOutputAdapter = createRoomOutputAdapter(common);
  const { onEvent } = createServerSocketOnBridge(socket);
  const { guardOnEvent } = createPayloadGuard(socket.id);
  const guardJoinRoomPayload = guardOnEvent(
    protocol.SocketEvents.JOIN_ROOM,
    roomPayloadValidators[protocol.SocketEvents.JOIN_ROOM]
  );

  // 参加要求のペイロード検証と参加処理を実行する
  onEvent(protocol.SocketEvents.JOIN_ROOM, async (data) => {
    if (!guardJoinRoomPayload(data)) {
      return;
    }

    const { roomId } = data;

    const joinResult = joinRoomUseCase({
      roomManager,
      runtimeRegistry,
      socketId: socket.id,
      data,
      output: roomOutputAdapter,
    });

    // 参加拒否時は理由を通知する
    switch (joinResult.status) {
      case "full":
        logEvent(logScopes.NETWORK, {
          event: protocol.SocketEvents.JOIN_ROOM,
          result: logResults.REJECTED_ROOM_FULL,
          roomId,
          socketId: socket.id,
        });
        return;

      case "duplicate":
        logEvent(logScopes.NETWORK, {
          event: protocol.SocketEvents.JOIN_ROOM,
          result: logResults.REJECTED_DUPLICATE,
          roomId,
          socketId: socket.id,
        });
        return;

      case "joined":
        await socket.join(roomId);
        roomOutputAdapter.publishRoomUpdateToRoom(roomId, joinResult.room);
        logEvent(logScopes.ROOM_USE_CASE, {
          event: protocol.SocketEvents.ROOM_UPDATE,
          result: logResults.EMITTED,
          roomId,
          socketId: socket.id,
          ownerId: joinResult.room.ownerId,
          totalPlayers: joinResult.room.players.length,
        });
        return;

      default:
        return;
    }
  });
};
