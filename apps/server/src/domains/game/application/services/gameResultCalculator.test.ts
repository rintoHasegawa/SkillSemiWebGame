/**
 * gameResultCalculator.test
 * ゲーム結果ペイロード生成の現行挙動を固定する characterization test
 * 順位付け，同率処理，不正teamIdの扱い，スタッツ有無を検証する
 */
import { describe, expect, it } from "vitest";

import { buildGameResultPayload } from "./gameResultCalculator";

describe("buildGameResultPayload", () => {
  it("塗り数が最多のチームを1位にすること", () => {
    const result = buildGameResultPayload([0, 0, 0, 1]);

    expect(result.rankings[0]).toMatchObject({ rank: 1, teamId: 0 });
  });

  it("チーム数ぶんの順位を返すこと", () => {
    const result = buildGameResultPayload([0, 1, 2, 3]);

    expect(result.rankings).toHaveLength(4);
  });

  it("塗り率を百分率で算出すること", () => {
    const result = buildGameResultPayload([0, 0, 1, 2]);

    expect(result.rankings[0]?.paintRate).toBe(50);
  });

  it("空グリッドの場合は全チームの塗り率を0にすること", () => {
    const result = buildGameResultPayload([]);

    expect(result.rankings.every((item) => item.paintRate === 0)).toBe(true);
  });

  it("空グリッドの場合は全チームを同率1位にすること", () => {
    const result = buildGameResultPayload([]);

    expect(result.rankings.map((item) => item.rank)).toEqual([1, 1, 1, 1]);
  });

  it("同率チームには同じ順位を割り当てること", () => {
    const result = buildGameResultPayload([0, 1, 2, 3]);

    expect(result.rankings.map((item) => item.rank)).toEqual([1, 1, 1, 1]);
  });

  it("同率の次の順位は同率数ぶん飛ばすこと", () => {
    const result = buildGameResultPayload([0, 1, 2]);

    expect(result.rankings.map((item) => item.rank)).toEqual([1, 1, 1, 4]);
  });

  it("同率の場合はteamIdの昇順で並べること", () => {
    const result = buildGameResultPayload([3, 2, 1, 0]);

    expect(result.rankings.map((item) => item.teamId)).toEqual([0, 1, 2, 3]);
  });

  it("チームIDに対応するチーム名を解決すること", () => {
    const result = buildGameResultPayload([0]);

    expect(result.rankings[0]?.teamName).toBe("赤チーム");
  });

  it("範囲外のteamIdは塗り数に数えないこと", () => {
    const result = buildGameResultPayload([-1, 4, 99]);

    expect(result.rankings.every((item) => item.paintRate === 0)).toBe(true);
  });

  it("未塗りセルも塗り率の母数に含めること", () => {
    const result = buildGameResultPayload([0, -1, -1, -1]);

    expect(result.rankings[0]?.paintRate).toBe(25);
  });

  it("整数でないteamIdは塗り数に数えないこと", () => {
    const result = buildGameResultPayload([1.5, 0]);

    expect(result.rankings[0]).toMatchObject({ teamId: 0, paintRate: 50 });
  });

  it("最終グリッド色を複製して返すこと", () => {
    const gridColors = [0, 1, 2, 3];

    const result = buildGameResultPayload(gridColors);

    expect(result.finalGridColors).not.toBe(gridColors);
  });

  it("最終グリッド色の内容は入力と一致すること", () => {
    const result = buildGameResultPayload([0, 1, 2, 3]);

    expect(result.finalGridColors).toEqual([0, 1, 2, 3]);
  });

  it("プレイヤー情報を渡さない場合はplayerStatsを含めないこと", () => {
    const result = buildGameResultPayload([0]);

    expect(result.playerStats).toBeUndefined();
  });

  it("プレイヤー情報を渡した場合はスタッツへ変換すること", () => {
    const result = buildGameResultPayload(
      [0],
      [
        {
          id: "socket-1",
          name: "太郎",
          teamId: 0,
          paintCount: 12,
          bombHitCount: 3,
        },
      ],
    );

    expect(result.playerStats).toEqual([
      {
        playerId: "socket-1",
        playerName: "太郎",
        teamId: 0,
        paintCount: 12,
        bombHitCount: 3,
      },
    ]);
  });

  it("プレイヤーが空配列の場合はplayerStatsを空配列で含めること", () => {
    const result = buildGameResultPayload([0], []);

    expect(result.playerStats).toEqual([]);
  });
});
