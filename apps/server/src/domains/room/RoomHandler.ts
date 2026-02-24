import { Server, Socket } from "socket.io";
import { RoomManager } from "./RoomManager";
import { protocol } from "@repo/shared";
import type { roomTypes } from "@repo/shared";
import { joinRoomUseCase } from "./application/useCases/executeJoinRoomUseCase";
import { roomDisconnectUseCase } from "./application/useCases/executeRoomDisconnectUseCase";

export const registerRoomHandlers = (io: Server, socket: Socket, roomManager: RoomManager) => {
  
  socket.on(protocol.SocketEvents.JOIN_ROOM, (data: roomTypes.JoinRoomPayload) => {
    const { roomId } = data;
    
    socket.join(roomId);

    joinRoomUseCase({
      roomManager,
      socketId: socket.id,
      data,
      emitToRoom: (targetRoomId, event, payload) => {
        if (payload === undefined) {
          io.to(targetRoomId).emit(event);
          return;
        }

        io.to(targetRoomId).emit(event, payload);
      },
    });
  });

};

/**
 * 切断時のルームクリーンアップ処理
 */
export const handleRoomDisconnect = (io: Server, socket: Socket, roomManager: RoomManager) => {
  roomDisconnectUseCase({
    roomManager,
    socketId: socket.id,
    emitToRoom: (roomId, event, payload) => {
      if (payload === undefined) {
        io.to(roomId).emit(event);
        return;
      }

      io.to(roomId).emit(event, payload);
    },
  });
};