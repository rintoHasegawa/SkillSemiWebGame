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
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        ownerId: socketId,
        players: [],
        status: domain.room.RoomPhase.WAITING,
        maxPlayers: config.GAME_CONFIG.MAX_PLAYERS_PER_ROOM,
        fieldSizePreset: config.GAME_CONFIG.DEFAULT_FIELD_PRESET,
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

    // 同一ソケットの重複参加を防止する
    const alreadyJoined = room.players.some((player) => player.id === socketId);
    if (alreadyJoined) {
      logEvent(logScopes.ROOM_JOIN_SERVICE, {
        event: roomDomainLogEvents.PLAYER_JOIN,
        result: logResults.IGNORED_DUPLICATE,
        roomId,
        socketId,
        totalPlayers: room.players.length,
      });
      return { room, status: "duplicate" };
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
}
