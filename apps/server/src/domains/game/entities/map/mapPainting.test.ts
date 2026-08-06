/**
 * mapPainting.test
 * マップセル塗り更新の現行挙動を固定する characterization test
 * 差分追加の有無と範囲外インデックス時の振る舞いを検証する
 */
import { describe, expect, it } from "vitest";

import { domain } from "@repo/shared";

import { paintCellIfChanged } from "./mapPainting";

describe("paintCellIfChanged", () => {
  it("未塗りセルを塗った場合はtrueを返すこと", () => {
    const gridColors = [-1, -1, -1];
    const pendingUpdates: domain.game.gridMap.CellUpdate[] = [];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates,
      index: 1,
      teamId: 2,
    });

    expect(changed).toBe(true);
  });

  it("未塗りセルを塗った場合はgridColorsを更新すること", () => {
    const gridColors = [-1, -1, -1];

    paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 1,
      teamId: 2,
    });

    expect(gridColors).toEqual([-1, 2, -1]);
  });

  it("塗り替え時はindexとteamIdの差分を追加すること", () => {
    const pendingUpdates: domain.game.gridMap.CellUpdate[] = [];

    paintCellIfChanged({
      gridColors: [-1, -1],
      pendingUpdates,
      index: 0,
      teamId: 3,
    });

    expect(pendingUpdates).toEqual([{ index: 0, teamId: 3 }]);
  });

  it("既に同じ色の場合はfalseを返すこと", () => {
    const changed = paintCellIfChanged({
      gridColors: [2, -1],
      pendingUpdates: [],
      index: 0,
      teamId: 2,
    });

    expect(changed).toBe(false);
  });

  it("既に同じ色の場合は差分を追加しないこと", () => {
    const pendingUpdates: domain.game.gridMap.CellUpdate[] = [];

    paintCellIfChanged({
      gridColors: [2, -1],
      pendingUpdates,
      index: 0,
      teamId: 2,
    });

    expect(pendingUpdates).toEqual([]);
  });

  it("既存の差分を保持したまま末尾に追加すること", () => {
    const pendingUpdates: domain.game.gridMap.CellUpdate[] = [
      { index: 9, teamId: 1 },
    ];

    paintCellIfChanged({
      gridColors: [-1, -1],
      pendingUpdates,
      index: 0,
      teamId: 3,
    });

    expect(pendingUpdates).toEqual([
      { index: 9, teamId: 1 },
      { index: 0, teamId: 3 },
    ]);
  });

  it("別チームの色で上書きできること", () => {
    const gridColors = [1, -1];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 0,
      teamId: 2,
    });

    expect(changed).toBe(true);
    expect(gridColors[0]).toBe(2);
  });

  it("teamIdが-1の場合は未塗り状態へ戻せること", () => {
    const gridColors = [1, -1];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 0,
      teamId: -1,
    });

    expect(changed).toBe(true);
    expect(gridColors[0]).toBe(-1);
  });

  it("teamId0でも塗り替えとして扱うこと", () => {
    const gridColors = [-1];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 0,
      teamId: 0,
    });

    expect(changed).toBe(true);
    expect(gridColors[0]).toBe(0);
  });

  it("同一セルを連続して同じ色で塗る2回目はfalseを返すこと", () => {
    const gridColors = [-1];
    const pendingUpdates: domain.game.gridMap.CellUpdate[] = [];
    paintCellIfChanged({ gridColors, pendingUpdates, index: 0, teamId: 1 });

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates,
      index: 0,
      teamId: 1,
    });

    expect(changed).toBe(false);
    expect(pendingUpdates).toHaveLength(1);
  });

  it("先頭セル（index0）を塗れること", () => {
    const gridColors = [-1, -1];

    paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 0,
      teamId: 1,
    });

    expect(gridColors[0]).toBe(1);
  });

  it("末尾セルを塗れること", () => {
    const gridColors = [-1, -1, -1];

    paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 2,
      teamId: 1,
    });

    expect(gridColors[2]).toBe(1);
  });

  it("配列長以上のindexでもtrueを返して配列を伸長すること", () => {
    const gridColors = [-1, -1, -1];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 5,
      teamId: 1,
    });

    expect(changed).toBe(true);
    expect(gridColors).toHaveLength(6);
    expect(gridColors[5]).toBe(1);
  });

  it("配列長以上のindexでも差分を追加すること", () => {
    const pendingUpdates: domain.game.gridMap.CellUpdate[] = [];

    paintCellIfChanged({
      gridColors: [-1, -1, -1],
      pendingUpdates,
      index: 5,
      teamId: 1,
    });

    expect(pendingUpdates).toEqual([{ index: 5, teamId: 1 }]);
  });

  it("空配列のgridColorsでもindex0で伸長すること", () => {
    const gridColors: number[] = [];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 0,
      teamId: 1,
    });

    expect(changed).toBe(true);
    expect(gridColors).toEqual([1]);
  });

  it("負のindexでは配列長を変えずにtrueを返すこと", () => {
    const gridColors = [-1, -1];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: -1,
      teamId: 1,
    });

    expect(changed).toBe(true);
    expect(gridColors).toHaveLength(2);
  });

  it("負のindexでも差分を追加すること", () => {
    const pendingUpdates: domain.game.gridMap.CellUpdate[] = [];

    paintCellIfChanged({
      gridColors: [-1, -1],
      pendingUpdates,
      index: -1,
      teamId: 1,
    });

    expect(pendingUpdates).toEqual([{ index: -1, teamId: 1 }]);
  });

  it("NaNのindexでは配列長を変えずにtrueを返すこと", () => {
    const gridColors = [-1, -1];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: Number.NaN,
      teamId: 1,
    });

    expect(changed).toBe(true);
    expect(gridColors).toHaveLength(2);
  });

  it("NaNのindexでも差分を追加すること", () => {
    const pendingUpdates: domain.game.gridMap.CellUpdate[] = [];

    paintCellIfChanged({
      gridColors: [-1, -1],
      pendingUpdates,
      index: Number.NaN,
      teamId: 1,
    });

    expect(pendingUpdates).toHaveLength(1);
    expect(pendingUpdates[0].index).toBeNaN();
  });

  it("小数のindexでは配列長を変えずにtrueを返すこと", () => {
    const gridColors = [-1, -1];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 0.5,
      teamId: 1,
    });

    expect(changed).toBe(true);
    expect(gridColors).toHaveLength(2);
  });

  it("小数のindexでは要素ではなく小数キーのプロパティが設定されること", () => {
    const gridColors = [-1, -1];

    paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 0.5,
      teamId: 1,
    });

    expect(gridColors[0]).toBe(-1);
    expect(Object.getOwnPropertyDescriptor(gridColors, "0.5")?.value).toBe(1);
  });
});
