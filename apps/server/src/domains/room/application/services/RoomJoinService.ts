import { config, roomConsts } from "@repo/shared";
import type { roomTypes } from "@repo/shared";
import { logEvent } from "@server/network/logging/logEvent";

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
      logEvent("RoomJoinService", {
        event: "ROOM_CREATE",
        result: "created",
        roomId,
        socketId,
        ownerId: socketId,
      });
    }

    const newPlayer: roomTypes.RoomMember = {
      id: socketId,
      name: playerName,
      isOwner: room.ownerId === socketId,
      isReady: false,
    };

    room.players.push(newPlayer);
    logEvent("RoomJoinService", {
      event: "PLAYER_JOIN",
      result: "joined",
      roomId,
      socketId,
      playerName,
      totalPlayers: room.players.length,
    });

    return room;
  }
}
