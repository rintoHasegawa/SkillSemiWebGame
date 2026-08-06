/**
 * TargetSelectionPolicy.test
 * Bot目標セル選択の現行挙動を固定する characterization test
 * 範囲外候補の除外と未塗りセル優先の分岐を検証する
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { chooseNextTarget } from "./TargetSelectionPolicy";

const size = { gridCols: 3, gridRows: 3 };

/** 全セル未塗りのグリッドを生成する */
const createUnpaintedGrid = (): number[] => {
  return new Array<number>(size.gridCols * size.gridRows).fill(-1);
};

/** 全セル塗り済みのグリッドを生成する */
const createPaintedGrid = (): number[] => {
  return new Array<number>(size.gridCols * size.gridRows).fill(0);
};

/** Math.randomを固定値へ差し替える */
const mockRandom = (value: number): void => {
  vi.spyOn(Math, "random").mockReturnValue(value);
};

describe("chooseNextTarget", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("四方向の候補から未塗りセルを選ぶこと", () => {
    mockRandom(0);
    const gridColors = createPaintedGrid();
    gridColors[1 * size.gridCols + 2] = -1;

    expect(chooseNextTarget(1, 1, gridColors, size)).toEqual({ col: 2, row: 1 });
  });

  it("未塗りセルがない場合は隣接候補から選ぶこと", () => {
    mockRandom(0);

    expect(chooseNextTarget(1, 1, createPaintedGrid(), size)).toEqual({
      col: 2,
      row: 1,
    });
  });

  it("マップ範囲外の候補は除外すること", () => {
    mockRandom(0.99);

    expect(chooseNextTarget(0, 0, createPaintedGrid(), size)).toEqual({
      col: 0,
      row: 1,
    });
  });

  it("候補が1マスしかないグリッドでは現在位置を返すこと", () => {
    mockRandom(0);

    expect(
      chooseNextTarget(0, 0, [-1], { gridCols: 1, gridRows: 1 }),
    ).toEqual({ col: 0, row: 0 });
  });

  it("グリッド範囲外の色参照は未塗り扱いにすること", () => {
    mockRandom(0);

    expect(chooseNextTarget(1, 1, [], size)).toEqual({ col: 2, row: 1 });
  });

  it("全セル未塗りの場合も隣接候補を返すこと", () => {
    mockRandom(0.99);

    expect(chooseNextTarget(1, 1, createUnpaintedGrid(), size)).toEqual({
      col: 1,
      row: 0,
    });
  });
});
