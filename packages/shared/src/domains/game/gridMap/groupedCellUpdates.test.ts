/**
 * groupedCellUpdates.test
 * CellUpdate配列とGroupedCellUpdatesの相互変換の仕様を検証するユニットテスト
 * 空入力・同一セルの後勝ち集約・キー順序による並び替えを検証する
 * 受信側では値域外 teamId キーの読み飛ばしと往復後の最終状態一致も検証する
 */
import { describe, expect, it } from "vitest";

import { UNKNOWN_TEAM_ID } from "../../../config/gameConfig";
import type { CellUpdate } from "./gridMap.type";
import { groupCellUpdates, ungroupCellUpdates } from "./groupedCellUpdates";

// セル更新を順に適用した最終状態（index → teamId）を組み立てる
const applyCellUpdates = (updates: CellUpdate[]): Map<number, number> => {
  const cells = new Map<number, number>();
  updates.forEach(({ index, teamId }) => {
    cells.set(index, teamId);
  });

  return cells;
};

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

  it("同一indexの重複更新を1件へ集約すること", () => {
    const updates: CellUpdate[] = [
      { index: 7, teamId: 0 },
      { index: 7, teamId: 0 },
    ];

    expect(groupCellUpdates(updates)).toEqual({ "0": [7] });
  });

  it("同一indexが別teamIdで来た場合は後勝ちで1件へ集約すること", () => {
    const updates: CellUpdate[] = [
      { index: 7, teamId: 0 },
      { index: 7, teamId: 1 },
    ];

    expect(groupCellUpdates(updates)).toEqual({ "1": [7] });
  });

  it("同一indexが3回更新された場合も最後のteamIdのみ残すこと", () => {
    const updates: CellUpdate[] = [
      { index: 7, teamId: 0 },
      { index: 7, teamId: 3 },
      { index: 7, teamId: 2 },
    ];

    expect(groupCellUpdates(updates)).toEqual({ "2": [7] });
  });

  it("後勝ち集約で空になったteamIdのキーを残さないこと", () => {
    const updates: CellUpdate[] = [
      { index: 7, teamId: 0 },
      { index: 7, teamId: 1 },
    ];

    expect(Object.keys(groupCellUpdates(updates))).toEqual(["1"]);
  });

  it("集約後も同一indexが複数のteamIdキーに現れないこと", () => {
    const updates: CellUpdate[] = [
      { index: 1, teamId: 0 },
      { index: 2, teamId: 1 },
      { index: 1, teamId: 2 },
      { index: 2, teamId: 3 },
    ];

    const indices = Object.values(groupCellUpdates(updates)).flat();

    expect(indices).toHaveLength(new Set(indices).size);
  });

  it("未塗装(-1)への差し戻しも後勝ちで反映すること", () => {
    const updates: CellUpdate[] = [
      { index: 4, teamId: 2 },
      { index: 4, teamId: UNKNOWN_TEAM_ID },
    ];

    expect(groupCellUpdates(updates)).toEqual({ "-1": [4] });
  });

  it("重複しないindexは集約されず全て保持すること", () => {
    const updates: CellUpdate[] = [
      { index: 1, teamId: 1 },
      { index: 2, teamId: 1 },
      { index: 3, teamId: 1 },
    ];

    expect(groupCellUpdates(updates)).toEqual({ "1": [1, 2, 3] });
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

  it("実在チーム数の上限を超えるキーのエントリを読み飛ばすこと", () => {
    expect(ungroupCellUpdates({ "4": [1] })).toEqual([]);
  });

  it("未塗装より小さい負のキーのエントリを読み飛ばすこと", () => {
    expect(ungroupCellUpdates({ "-2": [1] })).toEqual([]);
  });

  it("値域を大きく外れたキーのエントリを読み飛ばすこと", () => {
    expect(ungroupCellUpdates({ "100": [1] })).toEqual([]);
  });

  it("値域外キーを読み飛ばしても値域内のキーは展開すること", () => {
    expect(ungroupCellUpdates({ "4": [1], "2": [5] })).toEqual([
      { index: 5, teamId: 2 },
    ]);
  });

  it("実在する全teamIdのキーを展開すること", () => {
    expect(ungroupCellUpdates({ "0": [0], "1": [1], "2": [2], "3": [3] })).toEqual(
      [
        { index: 0, teamId: 0 },
        { index: 1, teamId: 1 },
        { index: 2, teamId: 2 },
        { index: 3, teamId: 3 },
      ],
    );
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

  it("往復すると同一indexの重複分だけ件数が減ること", () => {
    const updates: CellUpdate[] = [
      { index: 1, teamId: 2 },
      { index: 1, teamId: 2 },
      { index: 9, teamId: 0 },
    ];

    expect(ungroupCellUpdates(groupCellUpdates(updates))).toHaveLength(2);
  });

  it("往復後の各indexが1度しか現れないこと", () => {
    const updates: CellUpdate[] = [
      { index: 1, teamId: 0 },
      { index: 1, teamId: 1 },
      { index: 2, teamId: 1 },
      { index: 2, teamId: 3 },
    ];

    const indices = ungroupCellUpdates(groupCellUpdates(updates)).map(
      (update) => update.index,
    );

    expect(indices).toHaveLength(new Set(indices).size);
  });

  it("往復後に適用した最終状態が送信側の最終状態と一致すること", () => {
    const updates: CellUpdate[] = [
      { index: 1, teamId: 0 },
      { index: 2, teamId: 1 },
      { index: 1, teamId: 3 },
      { index: 3, teamId: UNKNOWN_TEAM_ID },
      { index: 2, teamId: 2 },
    ];

    expect(applyCellUpdates(ungroupCellUpdates(groupCellUpdates(updates)))).toEqual(
      applyCellUpdates(updates),
    );
  });

  it("往復後の更新は適用順を入れ替えても最終状態が変わらないこと", () => {
    const updates: CellUpdate[] = [
      { index: 1, teamId: 0 },
      { index: 2, teamId: 1 },
      { index: 1, teamId: 3 },
      { index: 2, teamId: 2 },
    ];
    const received = ungroupCellUpdates(groupCellUpdates(updates));

    expect(applyCellUpdates([...received].reverse())).toEqual(
      applyCellUpdates(received),
    );
  });
});
