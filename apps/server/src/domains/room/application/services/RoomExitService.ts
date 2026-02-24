import type { roomTypes } from "@repo/shared";

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
      console.log("[RoomManager] player left", {
        roomId,
        socketId,
        totalPlayers: room.players.length,
      });

      if (room.players.length === 0) {
        this.rooms.delete(roomId);
        console.log("[RoomManager] deleted room", { roomId });
        continue;
      }

      if (room.ownerId === socketId) {
        room.ownerId = room.players[0].id;
        room.players[0].isOwner = true;
        console.log("[RoomManager] transferred ownership", {
          roomId,
          newOwnerId: room.ownerId,
        });
      }

      updatedRooms.push(room);
    }

    return updatedRooms;
  }
}
