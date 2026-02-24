import { Server, Socket } from "socket.io";
import { RoomManager } from "@server/domains/room/RoomManager";
import { protocol } from "@repo/shared";
import type { roomTypes } from "@repo/shared";
import { joinRoomUseCase } from "@server/domains/room/application/useCases/joinRoomUseCase";
import { createCommonHandlerContext } from "@server/network/handlers/CommonHandler";
import { createRoomEventPublisher } from "./createRoomEventPublisher";
import { isJoinRoomPayload } from "@server/network/validation/socketPayloadValidators";
import { logEvent } from "@server/logging/logEvent";

export const registerRoomHandlers = (
  io: Server,
  socket: Socket,
  roomManager: RoomManager
) => {
  const common = createCommonHandlerContext(io, socket);
  const roomPublisher = createRoomEventPublisher(common);

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

    joinRoomUseCase({
      roomManager,
      socketId: socket.id,
      data,
      publishRoomUpdate: roomPublisher.publishRoomUpdate,
    });
  });
};
