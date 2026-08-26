/**
 * fullMapCellUpdatesBuilder.test
 * マップ全体の塗り状態を CellUpdate 配列へ変換する仕様を検証する
 * 未塗装セル（-1）の除外と，空マップ・全塗装の境界を対象とする
 */
import { describe, expect, it } from "vitest";

import { buildFullMapCellUpdates } from "./fullMapCellUpdatesBuilder";

describe("buildFullMapCellUpdates", () => {
  it("空のマップでは空配列を返すこと", () => {
    expect(buildFullMapCellUpdates([])).toEqual([]);
  });

  it("全セルが未塗装のマップでは空配列を返すこと", () => {
    expect(buildFullMapCellUpdates([-1, -1, -1, -1])).toEqual([]);
  });

  it("塗装済みセルを index と teamId の組へ変換すること", () => {
    expect(buildFullMapCellUpdates([0])).toEqual([{ index: 0, teamId: 0 }]);
  });

  it("未塗装セルを除外して塗装済みセルのみ返すこと", () => {
    expect(buildFullMapCellUpdates([-1, 1, -1, 2])).toEqual([
      { index: 1, teamId: 1 },
      { index: 3, teamId: 2 },
    ]);
  });

  it("全セルが塗装済みならセル数と同じ件数を返すこと", () => {
    expect(buildFullMapCellUpdates([0, 1, 2, 3])).toHaveLength(4);
  });

  it("配列の並び順どおりに index を割り当てること", () => {
    const cellUpdates = buildFullMapCellUpdates([3, -1, 0]);

    expect(cellUpdates.map((cell) => cell.index)).toEqual([0, 2]);
  });

  it("同じチームで塗られた複数セルをすべて返すこと", () => {
    expect(buildFullMapCellUpdates([2, 2, -1])).toEqual([
      { index: 0, teamId: 2 },
      { index: 1, teamId: 2 },
    ]);
  });

  it("末尾が未塗装でも先頭側の塗装を落とさないこと", () => {
    expect(buildFullMapCellUpdates([0, -1])).toEqual([{ index: 0, teamId: 0 }]);
  });

  it("先頭が未塗装でも末尾側の塗装を落とさないこと", () => {
    expect(buildFullMapCellUpdates([-1, 0])).toEqual([{ index: 1, teamId: 0 }]);
  });

  it("入力配列を変更しないこと", () => {
    const gridColors = [-1, 1];

    buildFullMapCellUpdates(gridColors);

    expect(gridColors).toEqual([-1, 1]);
  });
});
