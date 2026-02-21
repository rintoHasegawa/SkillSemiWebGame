import { Server, Socket } from "socket.io";
import { RoomManager } from "../managers/RoomManager.js";
import { SocketEvents } from "@repo/shared/src/protocol/events";
import type { JoinRoomPayload } from "@repo/shared/src/types/payloads";

export const registerRoomHandlers = (io: Server, socket: Socket, roomManager: RoomManager) => {
  
  socket.on(SocketEvents.JOIN_ROOM, (data: JoinRoomPayload) => {
    const { roomId, playerName } = data;
    
    socket.join(roomId);

    // RoomManagerにデータ操作を依頼
    const room = roomManager.addPlayerToRoom(roomId, socket.id, playerName);

    // ルーム内全員向け最新状態配信
    io.to(roomId).emit(SocketEvents.ROOM_UPDATE, room);
  });

};