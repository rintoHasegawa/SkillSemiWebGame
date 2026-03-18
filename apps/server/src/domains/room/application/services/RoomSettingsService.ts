/**
 * RoomSettingsService
 * ロビー設定（ゲーム人数・フィールドサイズ・チーム割り当て方式）の更新処理を提供する
 */
import { domain } from "@repo/shared";

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

    room.targetPlayerCount = targetPlayerCount;
    room.fieldSizePreset = fieldSizePreset;
    room.teamAssignmentMode = teamAssignmentMode;
    return room;
  }
}
