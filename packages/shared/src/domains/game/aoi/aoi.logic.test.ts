/**
 * aoi.logic.test
 * AOIセル座標とAOI窓計算の現行挙動を固定する characterization test
 * 既定設定値・負座標の切り捨て・窓境界の包含判定を検証する
 */
import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "../../../config/gameConfig";
import {
  isPositionInAoiWindow,
  isSameAoiCell,
  resolveAoiCellFromPosition,
  resolveAoiWindowFromCell,
} from "./aoi.logic";

describe("resolveAoiCellFromPosition", () => {
  it("原点をセル(0, 0)に解決すること", () => {
    expect(resolveAoiCellFromPosition(0, 0)).toEqual({ col: 0, row: 0 });
  });

  it("既定セルサイズ 3 で座標をセル座標に解決すること", () => {
    expect(resolveAoiCellFromPosition(5, 7)).toEqual({ col: 1, row: 2 });
  });

  it("セル境界の座標を次のセルに割り当てること", () => {
    expect(resolveAoiCellFromPosition(3, 3)).toEqual({ col: 1, row: 1 });
  });

  it("セル境界直前の座標を手前のセルに割り当てること", () => {
    expect(resolveAoiCellFromPosition(2.999, 2.999)).toEqual({
      col: 0,
      row: 0,
    });
  });

  it("わずかに負の座標をセル -1 に割り当てること", () => {
    expect(resolveAoiCellFromPosition(-0.001, -0.001)).toEqual({
      col: -1,
      row: -1,
    });
  });

  it("負の座標を切り捨て方向に解決すること", () => {
    expect(resolveAoiCellFromPosition(-3, -4)).toEqual({ col: -1, row: -2 });
  });

  it("セルサイズを指定した場合はその粒度で解決すること", () => {
    expect(resolveAoiCellFromPosition(10, 10, 5)).toEqual({ col: 2, row: 2 });
  });

  it("セルサイズ 1 では座標の整数部がそのままセル座標になること", () => {
    expect(resolveAoiCellFromPosition(7.5, 2.5, 1)).toEqual({
      col: 7,
      row: 2,
    });
  });

  it("セルサイズ 0 かつ原点ではセル座標が NaN になること", () => {
    const cell = resolveAoiCellFromPosition(0, 0, 0);

    expect(cell.col).toBeNaN();
    expect(cell.row).toBeNaN();
  });

  it("セルサイズ 0 かつ正座標ではセル座標が Infinity になること", () => {
    expect(resolveAoiCellFromPosition(5, 5, 0)).toEqual({
      col: Number.POSITIVE_INFINITY,
      row: Number.POSITIVE_INFINITY,
    });
  });

  it("既定引数が GAME_CONFIG.AOI_CELL_SIZE と一致すること", () => {
    expect(resolveAoiCellFromPosition(7, 7)).toEqual(
      resolveAoiCellFromPosition(7, 7, GAME_CONFIG.AOI_CELL_SIZE),
    );
  });
});

describe("resolveAoiWindowFromCell", () => {
  it("既定の窓サイズ(5x3)で中心セルから窓を生成すること", () => {
    expect(resolveAoiWindowFromCell({ col: 4, row: 4 })).toEqual({
      minCol: 2,
      maxCol: 6,
      minRow: 3,
      maxRow: 5,
    });
  });

  it("原点セルでは負の境界を含む窓を生成すること", () => {
    expect(resolveAoiWindowFromCell({ col: 0, row: 0 })).toEqual({
      minCol: -2,
      maxCol: 2,
      minRow: -1,
      maxRow: 1,
    });
  });

  it("負のセル座標でも中心からの相対で窓を生成すること", () => {
    expect(resolveAoiWindowFromCell({ col: -3, row: -3 })).toEqual({
      minCol: -5,
      maxCol: -1,
      minRow: -4,
      maxRow: -2,
    });
  });

  it("窓サイズ 1 では中心セルのみの窓を生成すること", () => {
    expect(resolveAoiWindowFromCell({ col: 2, row: 3 }, 1, 1)).toEqual({
      minCol: 2,
      maxCol: 2,
      minRow: 3,
      maxRow: 3,
    });
  });

  it("窓サイズ 0 でも中心セルのみの窓を生成すること", () => {
    expect(resolveAoiWindowFromCell({ col: 2, row: 3 }, 0, 0)).toEqual({
      minCol: 2,
      maxCol: 2,
      minRow: 3,
      maxRow: 3,
    });
  });

  it("偶数の窓サイズ 4 では指定より広い 5 セル分の窓になること", () => {
    const window = resolveAoiWindowFromCell({ col: 0, row: 0 }, 4, 4);

    expect(window.maxCol - window.minCol + 1).toBe(5);
    expect(window.maxRow - window.minRow + 1).toBe(5);
  });

  it("既定引数が GAME_CONFIG の窓サイズと一致すること", () => {
    expect(resolveAoiWindowFromCell({ col: 1, row: 1 })).toEqual(
      resolveAoiWindowFromCell(
        { col: 1, row: 1 },
        GAME_CONFIG.AOI_WINDOW_COLS,
        GAME_CONFIG.AOI_WINDOW_ROWS,
      ),
    );
  });
});

describe("isPositionInAoiWindow", () => {
  const window = { minCol: 0, maxCol: 2, minRow: 0, maxRow: 1 };

  it("窓の内側の座標を含まれると判定すること", () => {
    expect(isPositionInAoiWindow(4, 4, window)).toBe(true);
  });

  it("窓の左上端セルの座標を含まれると判定すること", () => {
    expect(isPositionInAoiWindow(0, 0, window)).toBe(true);
  });

  it("窓の右下端セルの座標を含まれると判定すること", () => {
    expect(isPositionInAoiWindow(8, 5, window)).toBe(true);
  });

  it("窓の右端セルを超える座標を含まれないと判定すること", () => {
    expect(isPositionInAoiWindow(9, 0, window)).toBe(false);
  });

  it("窓の下端セルを超える座標を含まれないと判定すること", () => {
    expect(isPositionInAoiWindow(0, 6, window)).toBe(false);
  });

  it("窓の左端より小さい座標を含まれないと判定すること", () => {
    expect(isPositionInAoiWindow(-0.001, 0, window)).toBe(false);
  });

  it("窓の上端より小さい座標を含まれないと判定すること", () => {
    expect(isPositionInAoiWindow(0, -0.001, window)).toBe(false);
  });

  it("既定セルサイズでは窓外となる座標を含まれないと判定すること", () => {
    expect(isPositionInAoiWindow(9, 5, window)).toBe(false);
  });

  it("大きなセルサイズを指定すると同じ座標が含まれると判定されること", () => {
    expect(isPositionInAoiWindow(9, 5, window, 5)).toBe(true);
  });

  it("NaN 座標を含まれないと判定すること", () => {
    expect(isPositionInAoiWindow(Number.NaN, 0, window)).toBe(false);
  });
});

describe("isSameAoiCell", () => {
  it("col と row が一致する場合に true を返すこと", () => {
    expect(isSameAoiCell({ col: 1, row: 2 }, { col: 1, row: 2 })).toBe(true);
  });

  it("col が異なる場合に false を返すこと", () => {
    expect(isSameAoiCell({ col: 1, row: 2 }, { col: 0, row: 2 })).toBe(false);
  });

  it("row が異なる場合に false を返すこと", () => {
    expect(isSameAoiCell({ col: 1, row: 2 }, { col: 1, row: 3 })).toBe(false);
  });

  it("原点セル同士を一致と判定すること", () => {
    expect(isSameAoiCell({ col: 0, row: 0 }, { col: 0, row: 0 })).toBe(true);
  });

  it("負のセル座標同士も一致と判定すること", () => {
    expect(isSameAoiCell({ col: -1, row: -2 }, { col: -1, row: -2 })).toBe(
      true,
    );
  });

  it("NaN を含むセル同士を一致と判定しないこと", () => {
    expect(
      isSameAoiCell(
        { col: Number.NaN, row: Number.NaN },
        { col: Number.NaN, row: Number.NaN },
      ),
    ).toBe(false);
  });
});
