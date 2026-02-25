/**
 * TeamAssignmentService
 * プレイヤーのチーム割り当てロジックを提供するサービス
 */
import { config } from "@server/config";
import type { Player } from "../../entities/player/Player.js";

export class TeamAssignmentService {
  /**
   * 現在のプレイヤー状況から、最も人数が少ないチームIDを算出する
   */
  public static getBalancedTeamId(currentPlayers: Map<string, Player>): number {
    config.validateTeamConfig();
    const teamCount = config.GAME_CONFIG.TEAM_COUNT;
    const teamPopulations = new Array(teamCount).fill(0);

    // 現在の各チームの所属人数を数え上げる
    for (const player of currentPlayers.values()) {
      if (player.teamId >= 0 && player.teamId < teamCount) {
        teamPopulations[player.teamId]++;
      }
    }

    // 最も人数が少ないチームを探す
    let minPopulation = Infinity;
    let targetTeamId = 0;

    for (let i = 0; i < teamCount; i++) {
      if (teamPopulations[i] < minPopulation) {
        minPopulation = teamPopulations[i];
        targetTeamId = i; // 人数が一番少ないチームIDを記録
      }
    }

    return targetTeamId;
  }
}
