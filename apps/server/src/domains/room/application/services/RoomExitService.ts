/**
 * RoomExitService
 * ルーム退出処理とオーナー移譲処理を担うサービス
 */
import type { roomTypes } from "@repo/shared";
import { logEvent } from "@server/logging/logEvent";
import { logResults, roomDomainLogEvents } from "@server/logging/logEvents";

/** 退出要求に応じてプレイヤー削除とルーム整理を行うサービス */
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
        event: roomDomainLogEvents.PLAYER_LEAVE,
        result: logResults.REMOVED,
        roomId,
        socketId,
        totalPlayers: room.players.length,
      });

      if (room.players.length === 0) {
        this.rooms.delete(roomId);
        logEvent("RoomExitService", {
          event: roomDomainLogEvents.ROOM_DELETE,
          result: logResults.DELETED,
          roomId,
          socketId,
        });
        continue;
      }

      if (room.ownerId === socketId) {
        room.ownerId = room.players[0].id;
        room.players[0].isOwner = true;
        logEvent("RoomExitService", {
          event: roomDomainLogEvents.OWNER_TRANSFER,
          result: logResults.TRANSFERRED,
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
