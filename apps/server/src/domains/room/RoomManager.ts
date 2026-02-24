/**
 * RoomManager
 * ルーム状態の保持とルーム操作サービスへの委譲を担うマネージャ
 */
import type { roomTypes } from "@repo/shared";
import { RoomJoinService } from "./application/services/RoomJoinService";
import { RoomExitService } from "./application/services/RoomExitService";
import { RoomQueryService } from "./application/services/RoomQueryService";

/** ルーム操作の公開インターフェースを提供するマネージャ */
export class RoomManager {
  private rooms: Map<string, roomTypes.Room> = new Map();
  private roomJoinService: RoomJoinService;
  private roomExitService: RoomExitService;
  private roomQueryService: RoomQueryService;

  constructor() {
    this.roomJoinService = new RoomJoinService(this.rooms);
    this.roomExitService = new RoomExitService(this.rooms);
    this.roomQueryService = new RoomQueryService(this.rooms);
  }

  // ルームにプレイヤーを追加する，ルームが未作成なら新規作成する
  public addPlayerToRoom(roomId: string, socketId: string, playerName: string): roomTypes.Room {
    return this.roomJoinService.addPlayerToRoom(roomId, socketId, playerName);
  }

  // プレイヤーをルームから削除し，更新が発生したルーム配列を返す
  public removePlayer(socketId: string): roomTypes.Room[] {
    return this.roomExitService.removePlayer(socketId);
  }

  // オーナーIDからルームを取得する
  public getRoomByOwnerId(ownerId: string): roomTypes.Room | undefined {
    return this.roomQueryService.getRoomByOwnerId(ownerId);
  }
}