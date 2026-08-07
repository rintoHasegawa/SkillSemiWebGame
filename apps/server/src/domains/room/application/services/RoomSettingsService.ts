/**
 * RoomSettingsService
 * ロビー設定（ゲーム人数・フィールドサイズ・チーム割り当て方式）の更新処理を提供する
 * 不正なゲーム人数は反映せず，ログを残して更新を破棄する
 * ゲーム開始時に確定したフィールドサイズの反映も担う
 */
import { domain } from "@repo/shared";
import { config } from "@server/config";
import { logEvent } from "@server/logging/logger";
import { logResults, logScopes, roomDomainLogEvents } from "@server/logging/index";

/** ロビー設定の更新処理を担うサービス */
export class RoomSettingsService {
  constructor(private rooms: Map<string, domain.room.Room>) {}

  public updateLobbySettings(
    roomId: string,
    targetPlayerCount: number,
    fieldSizePreset: domain.room.Room["fieldSizePreset"],
    teamAssignmentMode: domain.room.TeamAssignmentMode,
  ): domain.room.Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== domain.room.RoomPhase.WAITING) {
      return undefined;
    }

    // チーム分けが成立しない人数・ルーム上限超過の人数は受け付けない
    if (!this.isValidTargetPlayerCount(targetPlayerCount, room.maxPlayers)) {
      logEvent(logScopes.ROOM_SETTINGS_SERVICE, {
        event: roomDomainLogEvents.LOBBY_SETTINGS_UPDATE,
        result: logResults.IGNORED_INVALID_PAYLOAD,
        roomId,
        targetPlayerCount,
      });
      return undefined;
    }

    room.targetPlayerCount = targetPlayerCount;
    room.fieldSizePreset = fieldSizePreset;
    room.teamAssignmentMode = teamAssignmentMode;
    return room;
  }

  // ゲーム開始時に確定したフィールドサイズを反映する
  // 開始直前はplayingへ遷移済みのため，updateLobbySettingsと違いフェーズは問わない
  public applyFieldSizePreset(
    roomId: string,
    fieldSizePreset: domain.room.Room["fieldSizePreset"],
  ): domain.room.Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) {
      return undefined;
    }

    room.fieldSizePreset = fieldSizePreset;
    return room;
  }

  private isValidTargetPlayerCount(
    targetPlayerCount: number,
    maxPlayers: number,
  ): boolean {
    return (
      Number.isInteger(targetPlayerCount)
      && targetPlayerCount >= config.GAME_CONFIG.TEAM_COUNT
      && targetPlayerCount <= maxPlayers
    );
  }
}
