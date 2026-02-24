import { Server, Socket } from "socket.io";
import { RoomManager } from "./RoomManager";
import { protocol } from "@repo/shared";
import type { roomTypes } from "@repo/shared";
import { joinRoomUseCase } from "./application/useCases/joinRoomUseCase";
import { roomDisconnectUseCase } from "./application/useCases/roomDisconnectUseCase";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";

const getEmitToRoom = (io: Server) => createEmitToRoom(io);

export const registerRoomHandlers = (io: Server, socket: Socket, roomManager: RoomManager) => {
  const emitToRoom = getEmitToRoom(io);
  
  socket.on(protocol.SocketEvents.JOIN_ROOM, (data: roomTypes.JoinRoomPayload) => {
    const { roomId } = data;
    
    socket.join(roomId);

    joinRoomUseCase({
      roomManager,
      socketId: socket.id,
      data,
      emitToRoom,
    });
  });

};

/**
 * 切断時のルームクリーンアップ処理
 */
export const handleRoomDisconnect = (io: Server, socket: Socket, roomManager: RoomManager) => {
  const emitToRoom = getEmitToRoom(io);

  roomDisconnectUseCase({
    roomManager,
    socketId: socket.id,
    emitToRoom,
  });
};