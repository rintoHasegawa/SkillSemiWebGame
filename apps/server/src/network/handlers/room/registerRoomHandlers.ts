/**
 * registerRoomHandlers
 * ルーム参加イベントの受信ハンドラを登録する
 */
import { Server, Socket } from "socket.io";
import { protocol } from "@repo/shared";
import type { JoinRoomPort } from "@server/domains/room/application/ports/roomUseCasePorts";
import { joinRoomUseCase } from "@server/domains/room/application/useCases/joinRoomUseCase";
import { logEvent } from "@server/logging/logEvent";
import { createCommonHandlerContext } from "@server/network/handlers/CommonHandler";
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
  roomManager: JoinRoomPort
) => {
  const common = createCommonHandlerContext(io, socket);
  const roomOutputAdapter = createRoomOutputAdapter(common);
  const { onEvent } = createServerSocketOnBridge(socket);

  // 参加要求のペイロード検証と参加処理を実行する
  onEvent(protocol.SocketEvents.JOIN_ROOM, async (data) => {
    if (!roomPayloadValidators[protocol.SocketEvents.JOIN_ROOM](data)) {
      logEvent("Network", {
        event: "JOIN_ROOM",
        result: "ignored_invalid_payload",
        socketId: socket.id,
      });
      return;
    }

    const { roomId } = data;

    const joinResult = joinRoomUseCase({
      roomManager,
      socketId: socket.id,
      data,
      output: roomOutputAdapter,
    });

    // 参加拒否時は理由を通知する
    switch (joinResult.status) {
      case "full":
        logEvent("Network", {
          event: "JOIN_ROOM",
          result: "rejected_room_full",
          roomId,
          socketId: socket.id,
        });
        return;

      case "duplicate":
        logEvent("Network", {
          event: "JOIN_ROOM",
          result: "rejected_duplicate",
          roomId,
          socketId: socket.id,
        });
        return;

      case "joined":
        await socket.join(roomId);
        roomOutputAdapter.publishRoomUpdateToRoom(roomId, joinResult.room);
        logEvent("RoomUseCase", {
          event: "ROOM_UPDATE",
          result: "emitted",
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
