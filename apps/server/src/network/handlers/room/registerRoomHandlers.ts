/**
 * registerRoomHandlers
 * ルーム参加イベントの受信ハンドラを登録する
 */
import { Socket } from "socket.io";
import { protocol } from "@repo/shared";
import type {
  RoomHandlerRoomPort,
  RoomHandlerRuntimePort,
} from "@server/network/types/connectionPorts";
import { createPayloadGuard } from "@server/network/handlers/payloadGuard";
import { createServerSocketOnBridge } from "@server/network/handlers/socketEventBridge";
import { isJoinRoomPayload } from "@server/network/validation/socketPayloadValidators";
import type { RoomOutputAdapter } from "./createRoomOutputAdapter";
import { handleJoinRoomEvent } from "./roomEventOrchestrators";

/** ルーム受信イベントごとの入力検証関数を保持するテーブル */
const roomPayloadValidators = {
  [protocol.SocketEvents.JOIN_ROOM]: isJoinRoomPayload,
} as const;

/** ルーム参加イベントを検証して参加ユースケースへ連携する */
export const registerRoomHandlers = (
  socket: Socket,
  roomManager: RoomHandlerRoomPort,
  runtimeRegistry: RoomHandlerRuntimePort,
  roomOutputAdapter: RoomOutputAdapter,
) => {
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

    await handleJoinRoomEvent(
      {
        socketId: socket.id,
        roomManager,
        runtimeRegistry,
        output: roomOutputAdapter,
        joinRoom: async (roomId) => {
          await socket.join(roomId);
        },
      },
      data,
    );
  });
};
