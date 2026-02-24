import type { roomTypes } from "@repo/shared";

export interface JoinRoomPort {
  addPlayerToRoom(roomId: string, socketId: string, playerName: string): roomTypes.Room;
}

export interface DisconnectRoomPort {
  removePlayer(socketId: string): roomTypes.Room[];
}
