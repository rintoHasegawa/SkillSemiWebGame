/**
 * registerRoomHandlers
 * ルーム参加イベントの受信ハンドラを登録する
 */
import { Server, Socket } from "socket.io";
import { RoomManager } from "@server/domains/room/RoomManager";
import { protocol } from "@repo/shared";
import type { roomTypes } from "@repo/shared";
import { joinRoomUseCase } from "@server/domains/room/application/useCases/joinRoomUseCase";
import { createCommonHandlerContext } from "@server/network/handlers/CommonHandler";
import { createRoomEventPublisher } from "./createRoomEventPublisher";
import { isJoinRoomPayload } from "@server/network/validation/socketPayloadValidators";
import { logEvent } from "@server/logging/logEvent";

/** ルーム参加イベントを検証して参加ユースケースへ連携する */
export const registerRoomHandlers = (
  io: Server,
  socket: Socket,
  roomManager: RoomManager
) => {
  const common = createCommonHandlerContext(io, socket);
  const roomPublisher = createRoomEventPublisher(common);

  // 参加要求のペイロード検証と参加処理を実行する
  socket.on(protocol.SocketEvents.JOIN_ROOM, (data: unknown) => {
    if (!isJoinRoomPayload(data)) {
      logEvent("Network", {
        event: "JOIN_ROOM",
        result: "ignored_invalid_payload",
        socketId: socket.id,
      });
      return;
    }

    const { roomId } = data;

    socket.join(roomId);

    const joinResult = joinRoomUseCase({
      roomManager,
      socketId: socket.id,
      data,
      publishRoomUpdate: roomPublisher.publishRoomUpdate,
    });

    // 満員拒否時はソケットのルーム参加状態を巻き戻す
    if (joinResult.status === "full") {
      socket.leave(roomId);
      roomPublisher.publishJoinRejected({
        roomId,
        reason: "full",
      });
      logEvent("Network", {
        event: "JOIN_ROOM",
        result: "rejected_room_full",
        roomId,
        socketId: socket.id,
      });
    }
  });
};
