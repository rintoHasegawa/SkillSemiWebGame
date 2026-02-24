import { config, roomConsts } from "@repo/shared";
import type { roomTypes } from "@repo/shared";

export class RoomJoinService {
  constructor(private rooms: Map<string, roomTypes.Room>) {}

  public addPlayerToRoom(roomId: string, socketId: string, playerName: string): roomTypes.Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        ownerId: socketId,
        players: [],
        status: roomConsts.RoomPhase.WAITING,
        maxPlayers: config.GAME_CONFIG.MAX_PLAYERS_PER_ROOM,
      };
      this.rooms.set(roomId, room);
      console.log("[RoomManager] created room", { roomId, ownerId: socketId });
    }

    const newPlayer: roomTypes.RoomMember = {
      id: socketId,
      name: playerName,
      isOwner: room.ownerId === socketId,
      isReady: false,
    };

    room.players.push(newPlayer);
    console.log("[RoomManager] player joined", {
      roomId,
      socketId,
      playerName,
      totalPlayers: room.players.length,
    });

    return room;
  }
}
