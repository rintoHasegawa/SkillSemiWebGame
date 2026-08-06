/**
 * MapStore.test
 * マップ塗り状態ストアの現行挙動を固定する characterization test
 * 初期化サイズ・差分キューの取り出しとクリア・スナップショット参照を検証する
 */
import { describe, expect, it } from "vitest";

import { config } from "@server/config";

import { MapStore } from "./MapStore";

const defaultTotalCells
  = config.GAME_CONFIG.GRID_COLS * config.GAME_CONFIG.GRID_ROWS;

/** テスト用に2x2の小さなマップストアを生成する */
const createSmallStore = (): MapStore => {
  return new MapStore({ gridCols: 2, gridRows: 2 });
};

describe("MapStore.constructor", () => {
  it("サイズ未指定の場合はconfigの既定セル数で初期化すること", () => {
    const store = new MapStore();

    expect(store.getGridColorsSnapshot()).toHaveLength(defaultTotalCells);
  });

  it("サイズ指定の場合は列数と行数の積のセル数で初期化すること", () => {
    const store = new MapStore({ gridCols: 3, gridRows: 4 });

    expect(store.getGridColorsSnapshot()).toHaveLength(12);
  });

  it("初期状態は全セルが-1であること", () => {
    const store = createSmallStore();

    expect(store.getGridColorsSnapshot()).toEqual([-1, -1, -1, -1]);
  });

  it("初期状態の差分キューは空であること", () => {
    const store = createSmallStore();

    expect(store.getAndClearUpdates()).toEqual([]);
  });

  it("列数0の場合は空のグリッドで初期化すること", () => {
    const store = new MapStore({ gridCols: 0, gridRows: 4 });

    expect(store.getGridColorsSnapshot()).toEqual([]);
  });

  it("インスタンス間でグリッド配列を共有しないこと", () => {
    const first = createSmallStore();
    const second = createSmallStore();

    first.paintCell(0, 1);

    expect(second.getGridColorsSnapshot()[0]).toBe(-1);
  });
});

describe("MapStore.paintCell", () => {
  it("未塗りセルを塗った場合はtrueを返すこと", () => {
    const store = createSmallStore();

    expect(store.paintCell(0, 1)).toBe(true);
  });

  it("塗った結果がスナップショットに反映されること", () => {
    const store = createSmallStore();

    store.paintCell(2, 3);

    expect(store.getGridColorsSnapshot()[2]).toBe(3);
  });

  it("同じ色で塗り直した場合はfalseを返すこと", () => {
    const store = createSmallStore();
    store.paintCell(0, 1);

    expect(store.paintCell(0, 1)).toBe(false);
  });

  it("同じ色で塗り直した場合は差分を追加しないこと", () => {
    const store = createSmallStore();
    store.paintCell(0, 1);
    store.paintCell(0, 1);

    expect(store.getAndClearUpdates()).toEqual([{ index: 0, teamId: 1 }]);
  });

  it("色が変わった場合はindexとteamIdの差分を積むこと", () => {
    const store = createSmallStore();

    store.paintCell(1, 2);

    expect(store.getAndClearUpdates()).toEqual([{ index: 1, teamId: 2 }]);
  });

  it("別チームの色で上書きできること", () => {
    const store = createSmallStore();
    store.paintCell(0, 1);

    expect(store.paintCell(0, 2)).toBe(true);
    expect(store.getGridColorsSnapshot()[0]).toBe(2);
  });

  it("teamId0でも塗り替えとして扱うこと", () => {
    const store = createSmallStore();

    expect(store.paintCell(0, 0)).toBe(true);
  });

  it("初期色と同じ-1で塗った場合はfalseを返すこと", () => {
    const store = createSmallStore();

    expect(store.paintCell(0, -1)).toBe(false);
  });

  it("末尾セルを塗れること", () => {
    const store = createSmallStore();

    expect(store.paintCell(3, 1)).toBe(true);
  });

  it("グリッド範囲外のindexでもtrueを返しグリッドを伸長すること", () => {
    const store = createSmallStore();

    expect(store.paintCell(10, 1)).toBe(true);
    expect(store.getGridColorsSnapshot()).toHaveLength(11);
  });

  it("グリッド範囲外のindexでも差分を積むこと", () => {
    const store = createSmallStore();

    store.paintCell(10, 1);

    expect(store.getAndClearUpdates()).toEqual([{ index: 10, teamId: 1 }]);
  });

  it("負のindexでも差分を積むこと", () => {
    const store = createSmallStore();

    expect(store.paintCell(-1, 1)).toBe(true);
    expect(store.getAndClearUpdates()).toEqual([{ index: -1, teamId: 1 }]);
  });

  it("複数セルの塗りが塗った順に差分へ積まれること", () => {
    const store = createSmallStore();

    store.paintCell(2, 1);
    store.paintCell(0, 2);

    expect(store.getAndClearUpdates()).toEqual([
      { index: 2, teamId: 1 },
      { index: 0, teamId: 2 },
    ]);
  });
});

describe("MapStore.getAndClearUpdates", () => {
  it("溜まった差分を返すこと", () => {
    const store = createSmallStore();
    store.paintCell(0, 1);

    expect(store.getAndClearUpdates()).toEqual([{ index: 0, teamId: 1 }]);
  });

  it("呼び出し後は差分キューが空になること", () => {
    const store = createSmallStore();
    store.paintCell(0, 1);
    store.getAndClearUpdates();

    expect(store.getAndClearUpdates()).toEqual([]);
  });

  it("差分がない場合は空配列を返すこと", () => {
    const store = createSmallStore();

    expect(store.getAndClearUpdates()).toEqual([]);
  });

  it("返した配列は以後の塗りで変更されないこと", () => {
    const store = createSmallStore();
    store.paintCell(0, 1);
    const updates = store.getAndClearUpdates();

    store.paintCell(1, 2);

    expect(updates).toEqual([{ index: 0, teamId: 1 }]);
  });

  it("呼び出しごとに異なる配列参照を返すこと", () => {
    const store = createSmallStore();

    expect(store.getAndClearUpdates()).not.toBe(store.getAndClearUpdates());
  });

  it("クリア後に塗った差分は次回の取得に含まれること", () => {
    const store = createSmallStore();
    store.paintCell(0, 1);
    store.getAndClearUpdates();

    store.paintCell(1, 2);

    expect(store.getAndClearUpdates()).toEqual([{ index: 1, teamId: 2 }]);
  });

  it("差分をクリアしてもグリッドの塗り状態は保持されること", () => {
    const store = createSmallStore();
    store.paintCell(0, 1);

    store.getAndClearUpdates();

    expect(store.getGridColorsSnapshot()[0]).toBe(1);
  });
});

describe("MapStore.getGridColorsSnapshot", () => {
  it("現在の塗り状態を返すこと", () => {
    const store = createSmallStore();
    store.paintCell(0, 1);
    store.paintCell(3, 2);

    expect(store.getGridColorsSnapshot()).toEqual([1, -1, -1, 2]);
  });

  it("同一インスタンスでは常に同じ配列参照を返すこと", () => {
    const store = createSmallStore();

    expect(store.getGridColorsSnapshot()).toBe(store.getGridColorsSnapshot());
  });

  it("取得済みの参照へ後続の塗りが反映されること", () => {
    const store = createSmallStore();
    const snapshot = store.getGridColorsSnapshot();

    store.paintCell(0, 1);

    expect(snapshot[0]).toBe(1);
  });
});
