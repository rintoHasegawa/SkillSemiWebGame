import { Server, Socket } from "socket.io";
import { RoomManager } from "@server/domains/room/RoomManager";
import { protocol } from "@repo/shared";
import type { roomTypes } from "@repo/shared";
import { joinRoomUseCase } from "@server/domains/room/application/useCases/joinRoomUseCase";
import { createCommonHandlerContext } from "@server/network/handlers/CommonHandler";

export const registerRoomHandlers = (
  io: Server,
  socket: Socket,
  roomManager: RoomManager
) => {
  const common = createCommonHandlerContext(io, socket);

  socket.on(protocol.SocketEvents.JOIN_ROOM, (data: roomTypes.JoinRoomPayload) => {
    const { roomId } = data;

    socket.join(roomId);

    joinRoomUseCase({
      roomManager,
      socketId: socket.id,
      data,
      emitToRoom: common.emitToRoom,
    });
  });
};
