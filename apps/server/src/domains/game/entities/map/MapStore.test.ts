/**
 * MapStore.test
 * マップ塗り状態ストアの仕様を検証するユニットテスト
 * 初期化サイズ・差分キューの取り出しとクリア・範囲外indexの拒否を検証する
 * 送信差分をグループ形式で往復させた受信結果が塗り状態と一致することも検証する
 */
import { domain } from "@repo/shared";
import { describe, expect, it } from "vitest";

import { config } from "@server/config";

import { MapStore } from "./MapStore";

const defaultTotalCells
  = config.GAME_CONFIG.GRID_COLS * config.GAME_CONFIG.GRID_ROWS;

/** テスト用に2x2の小さなマップストアを生成する */
const createSmallStore = (): MapStore => {
  return new MapStore({ gridCols: 2, gridRows: 2 });
};

/** クライアント受信側の複製グリッド（初期状態は未塗装）を生成する */
const createReplicaGrid = (): number[] => {
  return [...createSmallStore().getGridColorsView()];
};

/**
 * 1ティック分の差分をグループ形式で往復させて複製グリッドへ適用する
 * 受信側は index 上書きで適用するため，適用順の入れ替えも検証できる
 */
const applyTickToReplica = (
  store: MapStore,
  replica: number[],
  options: { reverse?: boolean } = {},
): void => {
  const grouped = domain.game.gridMap.groupCellUpdates(
    store.getAndClearUpdates(),
  );
  const received = domain.game.gridMap.ungroupCellUpdates(grouped);
  const ordered = options.reverse ? [...received].reverse() : received;

  ordered.forEach(({ index, teamId }) => {
    replica[index] = teamId;
  });
};

describe("MapStore.constructor", () => {
  it("サイズ未指定の場合はconfigの既定セル数で初期化すること", () => {
    const store = new MapStore();

    expect(store.getGridColorsView()).toHaveLength(defaultTotalCells);
  });

  it("サイズ指定の場合は列数と行数の積のセル数で初期化すること", () => {
    const store = new MapStore({ gridCols: 3, gridRows: 4 });

    expect(store.getGridColorsView()).toHaveLength(12);
  });

  it("初期状態は全セルが-1であること", () => {
    const store = createSmallStore();

    expect(store.getGridColorsView()).toEqual([-1, -1, -1, -1]);
  });

  it("初期状態の差分キューは空であること", () => {
    const store = createSmallStore();

    expect(store.getAndClearUpdates()).toEqual([]);
  });

  it("列数0の場合は空のグリッドで初期化すること", () => {
    const store = new MapStore({ gridCols: 0, gridRows: 4 });

    expect(store.getGridColorsView()).toEqual([]);
  });

  it("インスタンス間でグリッド配列を共有しないこと", () => {
    const first = createSmallStore();
    const second = createSmallStore();

    first.paintCell(0, 1);

    expect(second.getGridColorsView()[0]).toBe(-1);
  });
});

describe("MapStore.paintCell", () => {
  it("未塗りセルを塗った場合はtrueを返すこと", () => {
    const store = createSmallStore();

    expect(store.paintCell(0, 1)).toBe(true);
  });

  it("塗った結果がライブビューに反映されること", () => {
    const store = createSmallStore();

    store.paintCell(2, 3);

    expect(store.getGridColorsView()[2]).toBe(3);
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
    expect(store.getGridColorsView()[0]).toBe(2);
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

  it("グリッド範囲外のindexではfalseを返しグリッドを伸長しないこと", () => {
    const store = createSmallStore();

    expect(store.paintCell(10, 1)).toBe(false);
    expect(store.getGridColorsView()).toEqual([-1, -1, -1, -1]);
  });

  it("グリッド範囲外のindexでは差分を積まないこと", () => {
    const store = createSmallStore();

    store.paintCell(10, 1);

    expect(store.getAndClearUpdates()).toEqual([]);
  });

  it("負のindexではfalseを返し差分を積まないこと", () => {
    const store = createSmallStore();

    expect(store.paintCell(-1, 1)).toBe(false);
    expect(store.getAndClearUpdates()).toEqual([]);
  });

  it("NaNのindexではfalseを返し差分を積まないこと", () => {
    const store = createSmallStore();

    expect(store.paintCell(Number.NaN, 1)).toBe(false);
    expect(store.getAndClearUpdates()).toEqual([]);
  });

  it("小数のindexではfalseを返し差分を積まないこと", () => {
    const store = createSmallStore();

    expect(store.paintCell(1.5, 1)).toBe(false);
    expect(store.getAndClearUpdates()).toEqual([]);
  });

  it("セル数0のマップではindex0でもfalseを返すこと", () => {
    const store = new MapStore({ gridCols: 0, gridRows: 4 });

    expect(store.paintCell(0, 1)).toBe(false);
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

    expect(store.getGridColorsView()[0]).toBe(1);
  });
});

describe("MapStore.getGridColorsView", () => {
  it("現在の塗り状態を返すこと", () => {
    const store = createSmallStore();
    store.paintCell(0, 1);
    store.paintCell(3, 2);

    expect(store.getGridColorsView()).toEqual([1, -1, -1, 2]);
  });

  it("同一インスタンスでは常に同じ配列参照を返すこと", () => {
    const store = createSmallStore();

    expect(store.getGridColorsView()).toBe(store.getGridColorsView());
  });

  it("取得済みの参照へ後続の塗りが反映されること", () => {
    const store = createSmallStore();
    const view = store.getGridColorsView();

    store.paintCell(0, 1);

    expect(view[0]).toBe(1);
  });

  it("値を保持したい場合のコピーは後続の塗りで変化しないこと", () => {
    const store = createSmallStore();
    const copied = [...store.getGridColorsView()];

    store.paintCell(0, 1);

    expect(copied).toEqual([-1, -1, -1, -1]);
  });
});

describe("MapStore差分のグループ化往復", () => {
  it("1ティック分の差分を往復適用した結果がサーバーの塗り状態と一致すること", () => {
    const store = createSmallStore();
    const replica = createReplicaGrid();
    store.paintCell(0, 1);
    store.paintCell(1, 2);
    store.paintCell(3, 0);

    applyTickToReplica(store, replica);

    expect(replica).toEqual([...store.getGridColorsView()]);
  });

  it("同一セルを塗り直したティックでも往復後の状態が一致すること", () => {
    const store = createSmallStore();
    const replica = createReplicaGrid();
    store.paintCell(0, 1);
    store.paintCell(0, 2);
    store.paintCell(0, 3);
    store.paintCell(2, 1);

    applyTickToReplica(store, replica);

    expect(replica).toEqual([...store.getGridColorsView()]);
  });

  it("複数ティックにまたがる差分を順に適用しても状態が一致すること", () => {
    const store = createSmallStore();
    const replica = createReplicaGrid();

    store.paintCell(0, 1);
    store.paintCell(1, 2);
    applyTickToReplica(store, replica);
    store.paintCell(0, 3);
    store.paintCell(0, 2);
    applyTickToReplica(store, replica);

    expect(replica).toEqual([...store.getGridColorsView()]);
  });

  it("往復後の差分を逆順に適用しても状態が一致すること", () => {
    const store = createSmallStore();
    const replica = createReplicaGrid();
    store.paintCell(0, 1);
    store.paintCell(0, 2);
    store.paintCell(1, 3);

    applyTickToReplica(store, replica, { reverse: true });

    expect(replica).toEqual([...store.getGridColorsView()]);
  });
});
