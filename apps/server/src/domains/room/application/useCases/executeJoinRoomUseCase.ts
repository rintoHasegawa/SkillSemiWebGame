import { protocol } from "@repo/shared";
import type { roomTypes } from "@repo/shared";
import { RoomManager } from "@server/domains/room/RoomManager";

type EmitToRoom = (roomId: string, event: string, payload?: unknown) => void;

type ExecuteJoinRoomUseCaseParams = {
  roomManager: RoomManager;
  socketId: string;
  data: roomTypes.JoinRoomPayload;
  emitToRoom: EmitToRoom;
};

export const executeJoinRoomUseCase = ({
  roomManager,
  socketId,
  data,
  emitToRoom,
}: ExecuteJoinRoomUseCaseParams) => {
  const { roomId, playerName } = data;
  console.log("[RoomHandler] JOIN_ROOM received", { roomId, socketId, playerName });

  const room = roomManager.addPlayerToRoom(roomId, socketId, playerName);

  emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
  console.log("[RoomHandler] ROOM_UPDATE emitted", {
    roomId,
    ownerId: room.ownerId,
    totalPlayers: room.players.length,
  });
};
