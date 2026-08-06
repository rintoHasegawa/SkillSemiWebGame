/**
 * TeamAssignmentService.test
 * チーム均等割り当ての現行挙動を固定する characterization test
 * 空セッション，同数時の優先，範囲外teamIdの扱いを検証する
 */
import { describe, expect, it } from "vitest";

import { Player } from "../../entities/player/Player";
import { TeamAssignmentService } from "./TeamAssignmentService";

/** teamId配列からプレイヤーMapを生成する */
const createPlayers = (teamIds: number[]): Map<string, Player> => {
  const players = new Map<string, Player>();

  teamIds.forEach((teamId, index) => {
    const id = `socket-${index}`;
    players.set(id, new Player(id, `name-${index}`, teamId));
  });

  return players;
};

describe("TeamAssignmentService.getBalancedTeamId", () => {
  it("プレイヤーがいない場合はチーム0を返すこと", () => {
    expect(TeamAssignmentService.getBalancedTeamId(new Map())).toBe(0);
  });

  it("人数が最も少ないチームを返すこと", () => {
    const players = createPlayers([0, 0, 1, 1, 2, 2, 3]);

    expect(TeamAssignmentService.getBalancedTeamId(players)).toBe(3);
  });

  it("最少人数が同数の場合は小さいチームIDを返すこと", () => {
    const players = createPlayers([0, 1]);

    expect(TeamAssignmentService.getBalancedTeamId(players)).toBe(2);
  });

  it("全チーム同数の場合はチーム0を返すこと", () => {
    const players = createPlayers([0, 1, 2, 3]);

    expect(TeamAssignmentService.getBalancedTeamId(players)).toBe(0);
  });

  it("負のteamIdは人数集計から除外すること", () => {
    const players = createPlayers([-1, -1, 0, 1, 2]);

    expect(TeamAssignmentService.getBalancedTeamId(players)).toBe(3);
  });

  it("チーム数以上のteamIdは人数集計から除外すること", () => {
    const players = createPlayers([4, 99, 0, 1, 2]);

    expect(TeamAssignmentService.getBalancedTeamId(players)).toBe(3);
  });
});
