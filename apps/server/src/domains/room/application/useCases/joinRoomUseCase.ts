import { protocol } from "@repo/shared";
import type { roomTypes } from "@repo/shared";
import type { JoinRoomPort } from "../ports/roomUseCasePorts";
import { logEvent } from "@server/network/logging/logEvent";

type EmitToRoom = (roomId: string, event: string, payload?: unknown) => void;

type JoinRoomUseCaseParams = {
  roomManager: JoinRoomPort;
  socketId: string;
  data: roomTypes.JoinRoomPayload;
  emitToRoom: EmitToRoom;
};

export const joinRoomUseCase = ({
  roomManager,
  socketId,
  data,
  emitToRoom,
}: JoinRoomUseCaseParams) => {
  const { roomId, playerName } = data;
  logEvent("RoomUseCase", {
    event: "JOIN_ROOM",
    result: "received",
    roomId,
    socketId,
    playerName,
  });

  const room = roomManager.addPlayerToRoom(roomId, socketId, playerName);

  emitToRoom(roomId, protocol.SocketEvents.ROOM_UPDATE, room);
  logEvent("RoomUseCase", {
    event: "ROOM_UPDATE",
    result: "emitted",
    roomId,
    socketId,
    ownerId: room.ownerId,
    totalPlayers: room.players.length,
  });
};
