/**
 * RoomManager
 * ルーム状態の保持とルーム操作サービスへの委譲を担うマネージャ
 */
import type { roomTypes } from "@repo/shared";
import { roomConsts } from "@repo/shared";
import { GameManager } from "@server/domains/game/GameManager";
import { RoomJoinService } from "./application/services/RoomJoinService";
import { RoomExitService } from "./application/services/RoomExitService";
import { RoomQueryService } from "./application/services/RoomQueryService";
import type { JoinRoomResult } from "./application/ports/roomUseCasePorts";

/** ルーム操作の公開インターフェースを提供するマネージャ */
export class RoomManager {
  private rooms: Map<string, roomTypes.Room> = new Map();
  private gameManagers: Map<string, GameManager> = new Map();
  private roomJoinService: RoomJoinService;
  private roomExitService: RoomExitService;
  private roomQueryService: RoomQueryService;

  constructor() {
    this.roomJoinService = new RoomJoinService(this.rooms);
    this.roomExitService = new RoomExitService(this.rooms);
    this.roomQueryService = new RoomQueryService(this.rooms);
  }

  // ルームにプレイヤーを追加する，ルームが未作成なら新規作成する
  public addPlayerToRoom(roomId: string, socketId: string, playerName: string): JoinRoomResult {
    const joinResult = this.roomJoinService.addPlayerToRoom(roomId, socketId, playerName);

    if (joinResult.status === "joined" && !this.gameManagers.has(roomId)) {
      this.gameManagers.set(roomId, new GameManager(roomId));
    }

    return joinResult;
  }

  // プレイヤーをルームから削除し，更新が発生したルーム配列を返す
  public removePlayer(socketId: string): roomTypes.Room[] {
    const updatedRooms = this.roomExitService.removePlayer(socketId);
    this.cleanupDisposedRooms();
    return updatedRooms;
  }

  // オーナーIDからルームを取得する
  public getRoomByOwnerId(ownerId: string): roomTypes.Room | undefined {
    return this.roomQueryService.getRoomByOwnerId(ownerId);
  }

  // ルームIDからルームを取得する
  public getRoomById(roomId: string): roomTypes.Room | undefined {
    return this.roomQueryService.getRoomById(roomId);
  }

  // プレイヤーIDから所属ルームを取得する
  public getRoomByPlayerId(playerId: string): roomTypes.Room | undefined {
    return this.roomQueryService.getRoomByPlayerId(playerId);
  }

  public getGameManagerByRoomId(roomId: string): GameManager | undefined {
    return this.gameManagers.get(roomId);
  }

  public getGameManagerByPlayerId(playerId: string): GameManager | undefined {
    const roomId = this.roomQueryService.getRoomByPlayerId(playerId)?.roomId;
    if (!roomId) {
      return undefined;
    }

    return this.gameManagers.get(roomId);
  }

  // ルーム状態をPLAYINGへ更新する
  public markRoomPlaying(roomId: string): roomTypes.Room | undefined {
    const room = this.roomQueryService.getRoomById(roomId);
    if (!room) {
      return undefined;
    }

    room.status = roomConsts.RoomPhase.PLAYING;
    return room;
  }

  // ルーム状態をWAITINGへ更新する
  public markRoomWaiting(roomId: string): roomTypes.Room | undefined {
    const room = this.roomQueryService.getRoomById(roomId);
    if (!room) {
      return undefined;
    }

    room.status = roomConsts.RoomPhase.WAITING;
    return room;
  }

  private cleanupDisposedRooms(): void {
    for (const [roomId, gameManager] of this.gameManagers.entries()) {
      if (this.rooms.has(roomId)) {
        continue;
      }

      gameManager.dispose();
      this.gameManagers.delete(roomId);
    }
  }
}