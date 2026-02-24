/**
 * handleRoomDisconnect
 * ルーム切断ユースケースを呼び出してルーム状態更新を配信する
 */
import { Server, Socket } from "socket.io";
import { RoomManager } from "@server/domains/room/RoomManager";
import { roomDisconnectUseCase } from "@server/domains/room/application/useCases/roomDisconnectUseCase";
import { createRoomDisconnectOutputAdapter } from "./createRoomOutputAdapter";

/** 切断ソケットのルーム離脱処理を実行して更新通知する */
export const handleRoomDisconnect = (
  io: Server,
  socket: Socket,
  roomManager: RoomManager
) => {
  const roomDisconnectOutputAdapter = createRoomDisconnectOutputAdapter(io);

  roomDisconnectUseCase({
    roomManager,
    socketId: socket.id,
    output: roomDisconnectOutputAdapter,
  });
};
