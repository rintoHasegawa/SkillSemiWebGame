/**
 * RoomExitService
 * ルーム退出処理とオーナー移譲処理を担うサービス
 */
import type { domain } from "@repo/shared";
import type { RoomDisconnectResult } from "../ports/roomUseCasePorts";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes, roomDomainLogEvents } from "@server/logging/index";

/** 退出要求に応じてプレイヤー削除とルーム整理を行うサービス */
export class RoomExitService {
  constructor(private rooms: Map<string, domain.room.Room>) {}

  public removePlayer(socketId: string): RoomDisconnectResult {
    const updatedRooms: domain.room.Room[] = [];
    const deletedRoomIds: string[] = [];

    for (const [roomId, room] of this.rooms.entries()) {
      const playerIndex = room.players.findIndex((player) => player.id === socketId);
      if (playerIndex === -1) {
        continue;
      }

      room.players.splice(playerIndex, 1);
      logEvent(logScopes.ROOM_EXIT_SERVICE, {
        event: roomDomainLogEvents.PLAYER_LEAVE,
        result: logResults.REMOVED,
        roomId,
        socketId,
        totalPlayers: room.players.length,
      });

      if (room.players.length === 0) {
        this.rooms.delete(roomId);
        deletedRoomIds.push(roomId);
        logEvent(logScopes.ROOM_EXIT_SERVICE, {
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
        logEvent(logScopes.ROOM_EXIT_SERVICE, {
          event: roomDomainLogEvents.OWNER_TRANSFER,
          result: logResults.TRANSFERRED,
          roomId,
          socketId,
          newOwnerId: room.ownerId,
        });
      }

      updatedRooms.push(room);
    }

    return {
      updatedRooms,
      deletedRoomIds,
    };
  }
}
