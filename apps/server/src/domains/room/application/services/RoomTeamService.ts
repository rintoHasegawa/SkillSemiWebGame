/**
 * RoomTeamService
 * プレイヤーのチーム選択処理（有効チーム範囲・上限チェックを含む）を提供する
 */
import { config as sharedConfig, domain } from "@repo/shared";
import type { SelectTeamResult } from "../ports/roomUseCasePorts";
import type { RoomQueryService } from "./RoomQueryService";

/** プレイヤーのチーム選択処理を担うサービス */
export class RoomTeamService {
  constructor(
    private roomQueryService: RoomQueryService,
  ) {}

  public selectTeam(
    playerId: string,
    preferredTeamId: number | null,
  ): SelectTeamResult {
    // チーム指定がある場合は有効チーム範囲（0〜TEAM_COUNT-1）に限定する
    if (
      preferredTeamId !== null
      && !sharedConfig.isKnownTeamId(preferredTeamId)
    ) {
      return { status: "invalid_team" };
    }

    const room = this.roomQueryService.getRoomByPlayerId(playerId);
    if (!room || room.status !== domain.room.RoomPhase.WAITING) {
      return { status: "not_found" };
    }

    const member = room.players.find((p) => p.id === playerId);
    if (!member) {
      return { status: "not_found" };
    }

    // チーム指定がある場合は人数上限を確認する（上限 = ゲーム人数 / チーム数）
    if (preferredTeamId !== null) {
      const maxPerTeam = Math.floor(
        (room.targetPlayerCount ?? room.maxPlayers)
        / sharedConfig.GAME_CONFIG.TEAM_COUNT,
      );
      const currentCount = room.players.filter(
        (p) => p.preferredTeamId === preferredTeamId && p.id !== playerId,
      ).length;
      if (currentCount >= maxPerTeam) {
        return { status: "team_full", teamId: preferredTeamId };
      }
    }

    member.preferredTeamId = preferredTeamId;
    return { status: "ok", room };
  }
}
