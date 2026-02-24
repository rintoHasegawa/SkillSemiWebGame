import type { roomTypes } from "@repo/shared";
import { logEvent } from "@server/network/logging/logEvent";

export class RoomExitService {
  constructor(private rooms: Map<string, roomTypes.Room>) {}

  public removePlayer(socketId: string): roomTypes.Room[] {
    const updatedRooms: roomTypes.Room[] = [];

    for (const [roomId, room] of this.rooms.entries()) {
      const playerIndex = room.players.findIndex((player) => player.id === socketId);
      if (playerIndex === -1) {
        continue;
      }

      room.players.splice(playerIndex, 1);
      logEvent("RoomExitService", {
        event: "PLAYER_LEAVE",
        result: "removed",
        roomId,
        socketId,
        totalPlayers: room.players.length,
      });

      if (room.players.length === 0) {
        this.rooms.delete(roomId);
        logEvent("RoomExitService", {
          event: "ROOM_DELETE",
          result: "deleted",
          roomId,
          socketId,
        });
        continue;
      }

      if (room.ownerId === socketId) {
        room.ownerId = room.players[0].id;
        room.players[0].isOwner = true;
        logEvent("RoomExitService", {
          event: "OWNER_TRANSFER",
          result: "transferred",
          roomId,
          socketId,
          newOwnerId: room.ownerId,
        });
      }

      updatedRooms.push(room);
    }

    return updatedRooms;
  }
}
