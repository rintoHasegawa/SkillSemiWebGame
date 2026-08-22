/**
 * RoomJoinService
 * ルーム作成とプレイヤー参加処理を担うサービス
 */
import { domain } from "@repo/shared";
import { config } from "@server/config";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes, roomDomainLogEvents } from "@server/logging/index";
import type { JoinRoomResult } from "../ports/roomUseCasePorts";

/** 参加要求に応じてルーム作成と参加者追加を行うサービス */
export class RoomJoinService {
  constructor(private rooms: Map<string, domain.room.Room>) {}

  public addPlayerToRoom(roomId: string, socketId: string, playerName: string): JoinRoomResult {
    // 同一ソケットの重複参加（同一ルーム・別ルームを問わず）をルーム生成より前に拒否する
    const joinedRoom = this.findRoomByPlayerId(socketId);
    if (joinedRoom) {
      logEvent(logScopes.ROOM_JOIN_SERVICE, {
        event: roomDomainLogEvents.PLAYER_JOIN,
        result: logResults.IGNORED_DUPLICATE,
        roomId,
        socketId,
        totalPlayers: joinedRoom.players.length,
      });
      return { room: joinedRoom, status: "duplicate" };
    }

    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        ownerId: socketId,
        players: [],
        status: domain.room.RoomPhase.WAITING,
        maxPlayers: config.GAME_CONFIG.MAX_PLAYERS_PER_ROOM,
        fieldSizePreset: config.GAME_CONFIG.DEFAULT_FIELD_PRESET,
        teamAssignmentMode: "random",
      };
      this.rooms.set(roomId, room);
      logEvent(logScopes.ROOM_JOIN_SERVICE, {
        event: roomDomainLogEvents.ROOM_CREATE,
        result: logResults.CREATED,
        roomId,
        socketId,
        ownerId: socketId,
      });
    }

    // 待機中以外のルームへの参加を拒否する
    if (room.status !== domain.room.RoomPhase.WAITING) {
      logEvent(logScopes.ROOM_JOIN_SERVICE, {
        event: roomDomainLogEvents.PLAYER_JOIN,
        result: logResults.REJECTED_ROOM_PLAYING,
        roomId,
        socketId,
      });
      return { room, status: "playing" };
    }

    // ルーム満員時の参加を拒否する
    if (room.players.length >= room.maxPlayers) {
      logEvent(logScopes.ROOM_JOIN_SERVICE, {
        event: roomDomainLogEvents.PLAYER_JOIN,
        result: logResults.IGNORED_ROOM_FULL,
        roomId,
        socketId,
        maxPlayers: room.maxPlayers,
        totalPlayers: room.players.length,
      });
      return { room, status: "full" };
    }

    const newPlayer: domain.room.RoomMember = {
      id: socketId,
      name: playerName,
      isOwner: room.ownerId === socketId,
      isReady: false,
      preferredTeamId: null,
    };

    room.players.push(newPlayer);
    logEvent(logScopes.ROOM_JOIN_SERVICE, {
      event: roomDomainLogEvents.PLAYER_JOIN,
      result: logResults.JOINED,
      roomId,
      socketId,
      playerName,
      totalPlayers: room.players.length,
    });

    return { room, status: "joined" };
  }

  // ソケットが既に参加しているルームを全ルームから探す
  private findRoomByPlayerId(socketId: string): domain.room.Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.some((player) => player.id === socketId)) {
        return room;
      }
    }

    return undefined;
  }
}
