import type { roomTypes } from "@repo/shared";
import { RoomJoinService } from "./application/services/RoomJoinService";
import { RoomExitService } from "./application/services/RoomExitService";
import { RoomQueryService } from "./application/services/RoomQueryService";

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

  // ルームにプレイヤーを追加（なければ作成）
  public addPlayerToRoom(roomId: string, socketId: string, playerName: string): roomTypes.Room {
    return this.roomJoinService.addPlayerToRoom(roomId, socketId, playerName);
  }

  // プレイヤーをルームから削除し、更新があったルームの配列を返す
  public removePlayer(socketId: string): roomTypes.Room[] {
    return this.roomExitService.removePlayer(socketId);
  }

  // オーナーIDからルームを取得
  public getRoomByOwnerId(ownerId: string): roomTypes.Room | undefined {
    return this.roomQueryService.getRoomByOwnerId(ownerId);
  }
}