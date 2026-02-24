import type { roomTypes } from "@repo/shared";
import type { JoinRoomPort } from "../ports/roomUseCasePorts";
import { logEvent } from "@server/logging/logEvent";

type JoinRoomUseCaseParams = {
  roomManager: JoinRoomPort;
  socketId: string;
  data: roomTypes.JoinRoomPayload;
  publishRoomUpdate: (roomId: roomTypes.Room["roomId"], room: roomTypes.Room) => void;
};

export const joinRoomUseCase = ({
  roomManager,
  socketId,
  data,
  publishRoomUpdate,
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

  publishRoomUpdate(roomId, room);
  logEvent("RoomUseCase", {
    event: "ROOM_UPDATE",
    result: "emitted",
    roomId,
    socketId,
    ownerId: room.ownerId,
    totalPlayers: room.players.length,
  });
};
