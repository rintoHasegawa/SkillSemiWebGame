/**
 * groupedCellUpdates.test
 * CellUpdate配列とGroupedCellUpdatesの相互変換の仕様を検証するユニットテスト
 * 空入力・重複・キー順序による並び替えと不正キーの読み飛ばしを検証する
 */
import { describe, expect, it } from "vitest";

import { UNKNOWN_TEAM_ID } from "../../../config/gameConfig";
import type { CellUpdate } from "./gridMap.type";
import { groupCellUpdates, ungroupCellUpdates } from "./groupedCellUpdates";

describe("groupCellUpdates", () => {
  it("空配列では空オブジェクトを返すこと", () => {
    expect(groupCellUpdates([])).toEqual({});
  });

  it("単一の更新を teamId をキーとするオブジェクトにまとめること", () => {
    expect(groupCellUpdates([{ index: 5, teamId: 2 }])).toEqual({ "2": [5] });
  });

  it("同一teamIdの更新を入力順に1つの配列へまとめること", () => {
    const updates: CellUpdate[] = [
      { index: 3, teamId: 1 },
      { index: 1, teamId: 1 },
      { index: 2, teamId: 1 },
    ];

    expect(groupCellUpdates(updates)).toEqual({ "1": [3, 1, 2] });
  });

  it("複数teamIdの更新をteamIdごとに分離すること", () => {
    const updates: CellUpdate[] = [
      { index: 0, teamId: 0 },
      { index: 1, teamId: 3 },
      { index: 2, teamId: 0 },
    ];

    expect(groupCellUpdates(updates)).toEqual({ "0": [0, 2], "3": [1] });
  });

  it("同一indexの重複更新を除去せず保持すること", () => {
    const updates: CellUpdate[] = [
      { index: 7, teamId: 0 },
      { index: 7, teamId: 0 },
    ];

    expect(groupCellUpdates(updates)).toEqual({ "0": [7, 7] });
  });

  it("同一indexが別teamIdで来た場合に両方保持すること", () => {
    const updates: CellUpdate[] = [
      { index: 7, teamId: 0 },
      { index: 7, teamId: 1 },
    ];

    expect(groupCellUpdates(updates)).toEqual({ "0": [7], "1": [7] });
  });

  it("teamId 0 を文字列キー \"0\" として扱うこと", () => {
    expect(Object.keys(groupCellUpdates([{ index: 1, teamId: 0 }]))).toEqual([
      "0",
    ]);
  });

  it("負のteamIdも文字列キーとして扱うこと", () => {
    expect(groupCellUpdates([{ index: 1, teamId: -1 }])).toEqual({
      "-1": [1],
    });
  });

  it("入力配列を変更しないこと", () => {
    const updates: CellUpdate[] = [{ index: 4, teamId: 2 }];

    groupCellUpdates(updates);

    expect(updates).toEqual([{ index: 4, teamId: 2 }]);
  });
});

describe("ungroupCellUpdates", () => {
  it("空オブジェクトでは空配列を返すこと", () => {
    expect(ungroupCellUpdates({})).toEqual([]);
  });

  it("単一teamIdのindex配列を CellUpdate 配列へ展開すること", () => {
    expect(ungroupCellUpdates({ "2": [5, 6] })).toEqual([
      { index: 5, teamId: 2 },
      { index: 6, teamId: 2 },
    ]);
  });

  it("キーの文字列teamIdを数値へ変換すること", () => {
    expect(ungroupCellUpdates({ "3": [1] })[0]?.teamId).toBe(3);
  });

  it("空のindex配列を持つteamIdでは何も展開しないこと", () => {
    expect(ungroupCellUpdates({ "1": [] })).toEqual([]);
  });

  it("複数teamIdを数値キー昇順で展開すること", () => {
    expect(ungroupCellUpdates({ "3": [30], "1": [10] })).toEqual([
      { index: 10, teamId: 1 },
      { index: 30, teamId: 3 },
    ]);
  });

  it("負のteamIdキーを数値キーより後に展開すること", () => {
    expect(ungroupCellUpdates({ "-1": [90], "0": [0] })).toEqual([
      { index: 0, teamId: 0 },
      { index: 90, teamId: -1 },
    ]);
  });

  it("数値化できないキーのエントリを読み飛ばすこと", () => {
    expect(ungroupCellUpdates({ invalid: [1] })).toEqual([]);
  });

  it("空文字キーのエントリを読み飛ばすこと", () => {
    expect(ungroupCellUpdates({ "": [1] })).toEqual([]);
  });

  it("小数キーのエントリを読み飛ばすこと", () => {
    expect(ungroupCellUpdates({ "1.5": [1] })).toEqual([]);
  });

  it("不正キーを読み飛ばしても正当なキーは展開すること", () => {
    expect(ungroupCellUpdates({ invalid: [1], "2": [5] })).toEqual([
      { index: 5, teamId: 2 },
    ]);
  });

  it("未塗装を表す \"-1\" キーは正当な teamId として展開すること", () => {
    expect(ungroupCellUpdates({ "-1": [4] })).toEqual([
      { index: 4, teamId: UNKNOWN_TEAM_ID },
    ]);
  });
});

describe("groupCellUpdates と ungroupCellUpdates の往復", () => {
  it("単一teamIdの更新を往復して同一の配列に戻すこと", () => {
    const updates: CellUpdate[] = [
      { index: 3, teamId: 1 },
      { index: 5, teamId: 1 },
    ];

    expect(ungroupCellUpdates(groupCellUpdates(updates))).toEqual(updates);
  });

  it("teamIdが交互に並ぶ更新は往復でteamId昇順に並び替わること", () => {
    const updates: CellUpdate[] = [
      { index: 1, teamId: 1 },
      { index: 2, teamId: 0 },
      { index: 3, teamId: 1 },
    ];

    expect(ungroupCellUpdates(groupCellUpdates(updates))).toEqual([
      { index: 2, teamId: 0 },
      { index: 1, teamId: 1 },
      { index: 3, teamId: 1 },
    ]);
  });

  it("往復しても更新件数が保存されること", () => {
    const updates: CellUpdate[] = [
      { index: 1, teamId: 2 },
      { index: 1, teamId: 2 },
      { index: 9, teamId: 0 },
    ];

    expect(ungroupCellUpdates(groupCellUpdates(updates))).toHaveLength(3);
  });
});
