/**
 * mapPainting.test
 * マップセル塗り更新の仕様を検証するユニットテスト
 * 差分追加の有無と範囲外・非整数インデックスを拒否する防御を検証する
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

  it("配列長ちょうどのindexではfalseを返すこと", () => {
    const changed = paintCellIfChanged({
      gridColors: [-1, -1, -1],
      pendingUpdates: [],
      index: 3,
      teamId: 1,
    });

    expect(changed).toBe(false);
  });

  it("配列長以上のindexではgridColorsを変更しないこと", () => {
    const gridColors = [-1, -1, -1];

    paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 5,
      teamId: 1,
    });

    expect(gridColors).toEqual([-1, -1, -1]);
  });

  it("配列長以上のindexでは差分を追加しないこと", () => {
    const pendingUpdates: domain.game.gridMap.CellUpdate[] = [];

    paintCellIfChanged({
      gridColors: [-1, -1, -1],
      pendingUpdates,
      index: 5,
      teamId: 1,
    });

    expect(pendingUpdates).toEqual([]);
  });

  it("空配列のgridColorsではindex0でもfalseを返すこと", () => {
    const gridColors: number[] = [];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 0,
      teamId: 1,
    });

    expect(changed).toBe(false);
    expect(gridColors).toEqual([]);
  });

  it("負のindexではfalseを返すこと", () => {
    const gridColors = [-1, -1];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: -1,
      teamId: 1,
    });

    expect(changed).toBe(false);
    expect(gridColors).toEqual([-1, -1]);
  });

  it("負のindexでは差分を追加しないこと", () => {
    const pendingUpdates: domain.game.gridMap.CellUpdate[] = [];

    paintCellIfChanged({
      gridColors: [-1, -1],
      pendingUpdates,
      index: -1,
      teamId: 1,
    });

    expect(pendingUpdates).toEqual([]);
  });

  it("NaNのindexではfalseを返しgridColorsを変更しないこと", () => {
    const gridColors = [-1, -1];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: Number.NaN,
      teamId: 1,
    });

    expect(changed).toBe(false);
    expect(gridColors).toEqual([-1, -1]);
  });

  it("NaNのindexでは差分を追加しないこと", () => {
    const pendingUpdates: domain.game.gridMap.CellUpdate[] = [];

    paintCellIfChanged({
      gridColors: [-1, -1],
      pendingUpdates,
      index: Number.NaN,
      teamId: 1,
    });

    expect(pendingUpdates).toEqual([]);
  });

  it("Infinityのindexではfalseを返しgridColorsを変更しないこと", () => {
    const gridColors = [-1, -1];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: Number.POSITIVE_INFINITY,
      teamId: 1,
    });

    expect(changed).toBe(false);
    expect(gridColors).toEqual([-1, -1]);
  });

  it("小数のindexではfalseを返すこと", () => {
    const changed = paintCellIfChanged({
      gridColors: [-1, -1],
      pendingUpdates: [],
      index: 0.5,
      teamId: 1,
    });

    expect(changed).toBe(false);
  });

  it("小数のindexでは小数キーのプロパティを追加しないこと", () => {
    const gridColors = [-1, -1];

    paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: 0.5,
      teamId: 1,
    });

    expect(Object.getOwnPropertyDescriptor(gridColors, "0.5")).toBeUndefined();
  });

  it("小数のindexでは差分を追加しないこと", () => {
    const pendingUpdates: domain.game.gridMap.CellUpdate[] = [];

    paintCellIfChanged({
      gridColors: [-1, -1],
      pendingUpdates,
      index: 0.5,
      teamId: 1,
    });

    expect(pendingUpdates).toEqual([]);
  });

  it("-0のindexは先頭セルとして塗れること", () => {
    const gridColors = [-1, -1];

    const changed = paintCellIfChanged({
      gridColors,
      pendingUpdates: [],
      index: -0,
      teamId: 1,
    });

    expect(changed).toBe(true);
    expect(gridColors[0]).toBe(1);
  });
});
