/**
 * RoomManager
 * ルーム状態の保持とルーム操作サービスへの委譲を担うマネージャ
 */
import { domain } from "@repo/shared";
import { RoomJoinService } from "./application/services/RoomJoinService";
import { RoomExitService } from "./application/services/RoomExitService";
import { RoomPhaseService } from "./application/services/RoomPhaseService";
import { RoomQueryService } from "./application/services/RoomQueryService";
import { RoomSettingsService } from "./application/services/RoomSettingsService";
import { RoomTeamService } from "./application/services/RoomTeamService";
import type {
  JoinRoomResult,
  RoomDisconnectResult,
  RoomPhaseTransitionResult,
  SelectTeamResult,
} from "./application/ports/roomUseCasePorts";

/** ルーム操作の公開インターフェースを提供するマネージャ */
export class RoomManager {
  private rooms: Map<string, domain.room.Room> = new Map();
  private roomJoinService: RoomJoinService;
  private roomExitService: RoomExitService;
  private roomPhaseService: RoomPhaseService;
  private roomQueryService: RoomQueryService;
  private roomSettingsService: RoomSettingsService;
  private roomTeamService: RoomTeamService;

  constructor() {
    this.roomJoinService = new RoomJoinService(this.rooms);
    this.roomExitService = new RoomExitService(this.rooms);
    this.roomPhaseService = new RoomPhaseService(this.rooms);
    this.roomQueryService = new RoomQueryService(this.rooms);
    this.roomSettingsService = new RoomSettingsService(this.rooms);
    this.roomTeamService = new RoomTeamService(this.roomQueryService);
  }

  // ルームにプレイヤーを追加する，ルームが未作成なら新規作成する
  public addPlayerToRoom(roomId: string, socketId: string, playerName: string): JoinRoomResult {
    return this.roomJoinService.addPlayerToRoom(roomId, socketId, playerName);
  }

  // プレイヤーをルームから削除し，更新が発生したルーム配列を返す
  public removePlayer(socketId: string): RoomDisconnectResult {
    return this.roomExitService.removePlayer(socketId);
  }

  // オーナーIDからルームを取得する
  public getRoomByOwnerId(ownerId: string): domain.room.Room | undefined {
    return this.roomQueryService.getRoomByOwnerId(ownerId);
  }

  // ルームIDからルームを取得する
  public getRoomById(roomId: string): domain.room.Room | undefined {
    return this.roomQueryService.getRoomById(roomId);
  }

  // プレイヤーIDから所属ルームを取得する
  public getRoomByPlayerId(playerId: string): domain.room.Room | undefined {
    return this.roomQueryService.getRoomByPlayerId(playerId);
  }

  // ルーム状態をPLAYINGへ更新する
  public markRoomPlaying(roomId: string): RoomPhaseTransitionResult {
    return this.roomPhaseService.markRoomPlaying(roomId);
  }

  // ルーム状態をWAITINGへ更新する
  public markRoomWaiting(roomId: string): RoomPhaseTransitionResult {
    return this.roomPhaseService.markRoomWaiting(roomId);
  }

  // ロビー設定（ゲーム人数・フィールドサイズ・チーム割り当て方式）を更新してルームを返す
  public updateLobbySettings(
    roomId: string,
    targetPlayerCount: number,
    fieldSizePreset: domain.room.Room["fieldSizePreset"],
    teamAssignmentMode: domain.room.TeamAssignmentMode,
  ): domain.room.Room | undefined {
    return this.roomSettingsService.updateLobbySettings(roomId, targetPlayerCount, fieldSizePreset, teamAssignmentMode);
  }

  // ゲーム開始時に確定したフィールドサイズを反映してルームを返す
  public applyFieldSizePreset(
    roomId: string,
    fieldSizePreset: domain.room.Room["fieldSizePreset"],
  ): domain.room.Room | undefined {
    return this.roomSettingsService.applyFieldSizePreset(roomId, fieldSizePreset);
  }

  // プレイヤーのチーム選択を更新する，チームが満員なら team_full を返す
  public selectTeam(
    playerId: string,
    preferredTeamId: number | null,
  ): SelectTeamResult {
    return this.roomTeamService.selectTeam(playerId, preferredTeamId);
  }

  // ルームを削除する
  public deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }
}