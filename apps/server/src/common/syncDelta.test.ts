/**
 * syncDelta.test
 * ID単位の差分抽出の現行挙動を固定する characterization test
 * 初回抽出・同値スキップ・キャッシュ更新副作用の境界挙動を検証する
 */
import { describe, expect, it, vi } from "vitest";

import { collectSyncDeltaEntries } from "./syncDelta";

type TestItem = {
  id: string;
  x: number;
  y: number;
};

type TestSnapshot = {
  x: number;
  y: number;
};

/** テスト用の差分抽出ルールを生成する */
const createOptions = () => {
  return {
    selectId: (item: TestItem) => item.id,
    toSnapshot: (item: TestItem): TestSnapshot => ({ x: item.x, y: item.y }),
    isSameSnapshot: (left: TestSnapshot, right: TestSnapshot) =>
      left.x === right.x && left.y === right.y,
  };
};

describe("collectSyncDeltaEntries", () => {
  it("要素が空の場合は空配列を返すこと", () => {
    const lastSnapshotById = new Map<string, TestSnapshot>();

    const entries = collectSyncDeltaEntries(
      [],
      lastSnapshotById,
      createOptions(),
    );

    expect(entries).toEqual([]);
  });

  it("要素が空の場合はキャッシュを変更しないこと", () => {
    const lastSnapshotById = new Map<string, TestSnapshot>([
      ["p1", { x: 1, y: 2 }],
    ]);

    collectSyncDeltaEntries([], lastSnapshotById, createOptions());

    expect(lastSnapshotById.get("p1")).toEqual({ x: 1, y: 2 });
  });

  it("前回スナップショットが無い要素は差分として返すこと", () => {
    const lastSnapshotById = new Map<string, TestSnapshot>();

    const entries = collectSyncDeltaEntries(
      [{ id: "p1", x: 1, y: 2 }],
      lastSnapshotById,
      createOptions(),
    );

    expect(entries).toEqual([
      { item: { id: "p1", x: 1, y: 2 }, snapshot: { x: 1, y: 2 } },
    ]);
  });

  it("差分として返した要素のスナップショットをキャッシュへ書き込むこと", () => {
    const lastSnapshotById = new Map<string, TestSnapshot>();

    collectSyncDeltaEntries(
      [{ id: "p1", x: 1, y: 2 }],
      lastSnapshotById,
      createOptions(),
    );

    expect(lastSnapshotById.get("p1")).toEqual({ x: 1, y: 2 });
  });

  it("返却されるitemは入力オブジェクトの参照そのものであること", () => {
    const item: TestItem = { id: "p1", x: 1, y: 2 };

    const entries = collectSyncDeltaEntries(
      [item],
      new Map<string, TestSnapshot>(),
      createOptions(),
    );

    expect(entries[0]?.item).toBe(item);
  });

  it("前回スナップショットと同値の要素は差分から除外すること", () => {
    const lastSnapshotById = new Map<string, TestSnapshot>([
      ["p1", { x: 1, y: 2 }],
    ]);

    const entries = collectSyncDeltaEntries(
      [{ id: "p1", x: 1, y: 2 }],
      lastSnapshotById,
      createOptions(),
    );

    expect(entries).toEqual([]);
  });

  it("同値でスキップした要素のキャッシュは元の参照のまま保持すること", () => {
    const lastSnapshot: TestSnapshot = { x: 1, y: 2 };
    const lastSnapshotById = new Map<string, TestSnapshot>([
      ["p1", lastSnapshot],
    ]);

    collectSyncDeltaEntries(
      [{ id: "p1", x: 1, y: 2 }],
      lastSnapshotById,
      createOptions(),
    );

    expect(lastSnapshotById.get("p1")).toBe(lastSnapshot);
  });

  it("前回スナップショットと差がある要素は差分として返すこと", () => {
    const lastSnapshotById = new Map<string, TestSnapshot>([
      ["p1", { x: 1, y: 2 }],
    ]);

    const entries = collectSyncDeltaEntries(
      [{ id: "p1", x: 1, y: 3 }],
      lastSnapshotById,
      createOptions(),
    );

    expect(entries).toEqual([
      { item: { id: "p1", x: 1, y: 3 }, snapshot: { x: 1, y: 3 } },
    ]);
  });

  it("差分ありの要素はキャッシュを新しいスナップショットで上書きすること", () => {
    const lastSnapshotById = new Map<string, TestSnapshot>([
      ["p1", { x: 1, y: 2 }],
    ]);

    collectSyncDeltaEntries(
      [{ id: "p1", x: 9, y: 9 }],
      lastSnapshotById,
      createOptions(),
    );

    expect(lastSnapshotById.get("p1")).toEqual({ x: 9, y: 9 });
  });

  it("変化した要素と同値の要素が混在する場合は変化した要素のみ返すこと", () => {
    const lastSnapshotById = new Map<string, TestSnapshot>([
      ["p1", { x: 1, y: 2 }],
      ["p2", { x: 3, y: 4 }],
    ]);

    const entries = collectSyncDeltaEntries(
      [
        { id: "p1", x: 1, y: 2 },
        { id: "p2", x: 3, y: 5 },
      ],
      lastSnapshotById,
      createOptions(),
    );

    expect(entries.map((entry) => entry.item.id)).toEqual(["p2"]);
  });

  it("入力順のまま差分を返すこと", () => {
    const entries = collectSyncDeltaEntries(
      [
        { id: "p3", x: 1, y: 1 },
        { id: "p1", x: 2, y: 2 },
        { id: "p2", x: 3, y: 3 },
      ],
      new Map<string, TestSnapshot>(),
      createOptions(),
    );

    expect(entries.map((entry) => entry.item.id)).toEqual(["p3", "p1", "p2"]);
  });

  it("同一IDが重複する場合は同値の2件目を除外すること", () => {
    const entries = collectSyncDeltaEntries(
      [
        { id: "p1", x: 1, y: 2 },
        { id: "p1", x: 1, y: 2 },
      ],
      new Map<string, TestSnapshot>(),
      createOptions(),
    );

    expect(entries).toHaveLength(1);
  });

  it("同一IDが重複し値が異なる場合は2件とも差分として返すこと", () => {
    const entries = collectSyncDeltaEntries(
      [
        { id: "p1", x: 1, y: 2 },
        { id: "p1", x: 1, y: 3 },
      ],
      new Map<string, TestSnapshot>(),
      createOptions(),
    );

    expect(entries.map((entry) => entry.snapshot)).toEqual([
      { x: 1, y: 2 },
      { x: 1, y: 3 },
    ]);
  });

  it("キャッシュに無いIDの比較関数は呼び出さないこと", () => {
    const options = createOptions();
    const isSameSnapshot = vi.fn(options.isSameSnapshot);

    collectSyncDeltaEntries([{ id: "p1", x: 1, y: 2 }], new Map(), {
      ...options,
      isSameSnapshot,
    });

    expect(isSameSnapshot).not.toHaveBeenCalled();
  });

  it("比較関数へ前回スナップショットと新スナップショットの順で渡すこと", () => {
    const options = createOptions();
    const isSameSnapshot = vi.fn(options.isSameSnapshot);
    const lastSnapshotById = new Map<string, TestSnapshot>([
      ["p1", { x: 1, y: 2 }],
    ]);

    collectSyncDeltaEntries([{ id: "p1", x: 5, y: 6 }], lastSnapshotById, {
      ...options,
      isSameSnapshot,
    });

    expect(isSameSnapshot).toHaveBeenCalledWith({ x: 1, y: 2 }, { x: 5, y: 6 });
  });

  it("selectIdが同じ文字列を返す限り異なる要素も同一IDとして扱うこと", () => {
    const options = createOptions();
    const entries = collectSyncDeltaEntries(
      [
        { id: "p1", x: 1, y: 2 },
        { id: "p2", x: 1, y: 2 },
      ],
      new Map<string, TestSnapshot>(),
      { ...options, selectId: () => "shared" },
    );

    expect(entries).toHaveLength(1);
  });

  it("スナップショットが0などの偽値の場合は同値でも差分として返すこと", () => {
    const lastSnapshotById = new Map<string, number>([["p1", 0]]);

    const entries = collectSyncDeltaEntries(
      [{ id: "p1", value: 0 }],
      lastSnapshotById,
      {
        selectId: (item: { id: string; value: number }) => item.id,
        toSnapshot: (item) => item.value,
        isSameSnapshot: (left, right) => left === right,
      },
    );

    expect(entries).toEqual([{ item: { id: "p1", value: 0 }, snapshot: 0 }]);
  });

  it("スナップショットが空文字の場合は同値でも差分として返すこと", () => {
    const lastSnapshotById = new Map<string, string>([["p1", ""]]);

    const entries = collectSyncDeltaEntries(
      [{ id: "p1", value: "" }],
      lastSnapshotById,
      {
        selectId: (item: { id: string; value: string }) => item.id,
        toSnapshot: (item) => item.value,
        isSameSnapshot: (left, right) => left === right,
      },
    );

    expect(entries).toHaveLength(1);
  });
});
