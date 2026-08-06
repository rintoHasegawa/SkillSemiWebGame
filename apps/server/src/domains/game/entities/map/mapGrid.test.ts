/**
 * mapGrid.test
 * マップ初期配列生成の現行挙動を固定する characterization test
 * 既定サイズの参照とサイズ指定時の境界条件を検証する
 */
import { describe, expect, it } from "vitest";

import { config } from "@server/config";

import { createInitialGridColors } from "./mapGrid";

const defaultTotalCells
  = config.GAME_CONFIG.GRID_COLS * config.GAME_CONFIG.GRID_ROWS;

describe("createInitialGridColors", () => {
  it("引数なしの場合はconfigのGRID_COLSとGRID_ROWSの積の要素数を返すこと", () => {
    expect(createInitialGridColors()).toHaveLength(defaultTotalCells);
  });

  it("引数なしの場合は全要素が-1であること", () => {
    const gridColors = createInitialGridColors();

    expect(gridColors.every((color) => color === -1)).toBe(true);
  });

  it("undefinedを渡した場合も既定サイズで生成すること", () => {
    expect(createInitialGridColors(undefined)).toHaveLength(defaultTotalCells);
  });

  it("サイズ指定時は指定した列数と行数の積の要素数を返すこと", () => {
    const gridColors = createInitialGridColors({ gridCols: 4, gridRows: 3 });

    expect(gridColors).toHaveLength(12);
  });

  it("サイズ指定時も全要素が-1であること", () => {
    const gridColors = createInitialGridColors({ gridCols: 2, gridRows: 2 });

    expect(gridColors).toEqual([-1, -1, -1, -1]);
  });

  it("1x1のサイズでは要素数1の配列を返すこと", () => {
    expect(createInitialGridColors({ gridCols: 1, gridRows: 1 })).toEqual([-1]);
  });

  it("列数0の場合は既定値へフォールバックせず空配列を返すこと", () => {
    expect(createInitialGridColors({ gridCols: 0, gridRows: 5 })).toEqual([]);
  });

  it("行数0の場合は既定値へフォールバックせず空配列を返すこと", () => {
    expect(createInitialGridColors({ gridCols: 5, gridRows: 0 })).toEqual([]);
  });

  it("列数と行数がともに0の場合は空配列を返すこと", () => {
    expect(createInitialGridColors({ gridCols: 0, gridRows: 0 })).toEqual([]);
  });

  it("呼び出しごとに新しい配列を返すこと", () => {
    expect(createInitialGridColors({ gridCols: 2, gridRows: 2 })).not.toBe(
      createInitialGridColors({ gridCols: 2, gridRows: 2 }),
    );
  });

  it("生成した配列を変更しても次回生成結果に影響しないこと", () => {
    const first = createInitialGridColors({ gridCols: 2, gridRows: 2 });
    first[0] = 3;

    expect(createInitialGridColors({ gridCols: 2, gridRows: 2 })[0]).toBe(-1);
  });

  it("積が小数になるサイズではRangeErrorを投げること", () => {
    expect(() => createInitialGridColors({ gridCols: 1.5, gridRows: 1 })).toThrow(
      RangeError,
    );
  });

  it("小数同士でも積が整数になるサイズでは整数個の配列を返すこと", () => {
    expect(createInitialGridColors({ gridCols: 2.5, gridRows: 2 })).toHaveLength(
      5,
    );
  });

  it("負の列数ではRangeErrorを投げること", () => {
    expect(() => createInitialGridColors({ gridCols: -1, gridRows: 1 })).toThrow(
      RangeError,
    );
  });

  it("NaNのサイズではRangeErrorを投げること", () => {
    expect(() =>
      createInitialGridColors({ gridCols: Number.NaN, gridRows: 1 }),
    ).toThrow(RangeError);
  });
});
