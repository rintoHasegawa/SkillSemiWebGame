/**
 * RoomJoinService
 * ルーム作成とプレイヤー参加処理を担うサービス
 */
import { config, roomConsts } from "@repo/shared";
import type { roomTypes } from "@repo/shared";
import { logEvent } from "@server/logging/logEvent";
import { logResults, roomDomainLogEvents } from "@server/logging/logEvents";
import type { JoinRoomResult } from "../ports/roomUseCasePorts";

/** 参加要求に応じてルーム作成と参加者追加を行うサービス */
export class RoomJoinService {
  constructor(private rooms: Map<string, roomTypes.Room>) {}

  public addPlayerToRoom(roomId: string, socketId: string, playerName: string): JoinRoomResult {
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
        event: roomDomainLogEvents.ROOM_CREATE,
        result: logResults.CREATED,
        roomId,
        socketId,
        ownerId: socketId,
      });
    }

    // 同一ソケットの重複参加を防止する
    const alreadyJoined = room.players.some((player) => player.id === socketId);
    if (alreadyJoined) {
      logEvent("RoomJoinService", {
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
      logEvent("RoomJoinService", {
        event: roomDomainLogEvents.PLAYER_JOIN,
        result: logResults.IGNORED_ROOM_FULL,
        roomId,
        socketId,
        maxPlayers: room.maxPlayers,
        totalPlayers: room.players.length,
      });
      return { room, status: "full" };
    }

    const newPlayer: roomTypes.RoomMember = {
      id: socketId,
      name: playerName,
      isOwner: room.ownerId === socketId,
      isReady: false,
    };

    room.players.push(newPlayer);
    logEvent("RoomJoinService", {
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
