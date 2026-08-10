/**
 * gridMap.logic.test
 * グリッド座標変換ロジックの仕様を検証するユニットテスト
 * 範囲判定の境界・小数座標の切り捨て・非有限座標を範囲外として扱う防御を検証する
 */
import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "../../../config/gameConfig";
import {
  getGridIndexFromPosition,
  getGridIndexFromPositionWithSize,
} from "./gridMap.logic";

describe("getGridIndexFromPositionWithSize", () => {
  it("グリッド内の座標を1次元インデックスに変換すること", () => {
    expect(getGridIndexFromPositionWithSize(2, 1, 4, 3)).toBe(6);
  });

  it("原点をインデックス 0 に変換すること", () => {
    expect(getGridIndexFromPositionWithSize(0, 0, 4, 3)).toBe(0);
  });

  it("右下端の座標を最終インデックスに変換すること", () => {
    expect(getGridIndexFromPositionWithSize(3, 2, 4, 3)).toBe(11);
  });

  it("小数座標を切り捨てて同一セルに割り当てること", () => {
    expect(getGridIndexFromPositionWithSize(2.9, 1.9, 4, 3)).toBe(6);
  });

  it("セル境界直前の座標を範囲内の最終セルに割り当てること", () => {
    expect(getGridIndexFromPositionWithSize(3.999, 2.999, 4, 3)).toBe(11);
  });

  it("列がグリッド幅と等しい場合に null を返すこと", () => {
    expect(getGridIndexFromPositionWithSize(4, 1, 4, 3)).toBeNull();
  });

  it("行がグリッド高さと等しい場合に null を返すこと", () => {
    expect(getGridIndexFromPositionWithSize(1, 3, 4, 3)).toBeNull();
  });

  it("負のx座標では null を返すこと", () => {
    expect(getGridIndexFromPositionWithSize(-1, 1, 4, 3)).toBeNull();
  });

  it("負のy座標では null を返すこと", () => {
    expect(getGridIndexFromPositionWithSize(1, -1, 4, 3)).toBeNull();
  });

  it("原点直前のわずかに負の座標では null を返すこと", () => {
    expect(getGridIndexFromPositionWithSize(-0.001, 0, 4, 3)).toBeNull();
  });

  it("グリッド幅が 0 の場合は常に null を返すこと", () => {
    expect(getGridIndexFromPositionWithSize(0, 0, 0, 3)).toBeNull();
  });

  it("グリッド高さが 0 の場合は常に null を返すこと", () => {
    expect(getGridIndexFromPositionWithSize(0, 0, 4, 0)).toBeNull();
  });

  it("正の無限大座標では null を返すこと", () => {
    expect(
      getGridIndexFromPositionWithSize(Number.POSITIVE_INFINITY, 0, 4, 3),
    ).toBeNull();
  });

  it("負の無限大座標では null を返すこと", () => {
    expect(
      getGridIndexFromPositionWithSize(Number.NEGATIVE_INFINITY, 0, 4, 3),
    ).toBeNull();
  });

  it("x座標が NaN の場合は null を返すこと", () => {
    expect(getGridIndexFromPositionWithSize(Number.NaN, 0, 4, 3)).toBeNull();
  });

  it("y座標が NaN の場合は null を返すこと", () => {
    expect(getGridIndexFromPositionWithSize(0, Number.NaN, 4, 3)).toBeNull();
  });

  it("y座標が正の無限大の場合は null を返すこと", () => {
    expect(
      getGridIndexFromPositionWithSize(0, Number.POSITIVE_INFINITY, 4, 3),
    ).toBeNull();
  });

  it("1列グリッドでは行番号がそのままインデックスになること", () => {
    expect(getGridIndexFromPositionWithSize(0, 2, 1, 3)).toBe(2);
  });
});

describe("getGridIndexFromPosition", () => {
  it("原点をインデックス 0 に変換すること", () => {
    expect(getGridIndexFromPosition(0, 0)).toBe(0);
  });

  it("既定グリッドの座標を1次元インデックスに変換すること", () => {
    expect(getGridIndexFromPosition(2, 1)).toBe(GAME_CONFIG.GRID_COLS + 2);
  });

  it("既定グリッドの右下端を最終インデックスに変換すること", () => {
    const lastIndex = GAME_CONFIG.GRID_COLS * GAME_CONFIG.GRID_ROWS - 1;

    expect(
      getGridIndexFromPosition(
        GAME_CONFIG.GRID_COLS - 1,
        GAME_CONFIG.GRID_ROWS - 1,
      ),
    ).toBe(lastIndex);
  });

  it("既定グリッドの右端を超える座標では null を返すこと", () => {
    expect(getGridIndexFromPosition(GAME_CONFIG.GRID_COLS, 0)).toBeNull();
  });

  it("既定グリッドの下端を超える座標では null を返すこと", () => {
    expect(getGridIndexFromPosition(0, GAME_CONFIG.GRID_ROWS)).toBeNull();
  });

  it("負の座標では null を返すこと", () => {
    expect(getGridIndexFromPosition(-0.5, 0)).toBeNull();
  });

  it("x座標が NaN の場合は null を返すこと", () => {
    expect(getGridIndexFromPosition(Number.NaN, 0)).toBeNull();
  });

  it("y座標が NaN の場合は null を返すこと", () => {
    expect(getGridIndexFromPosition(0, Number.NaN)).toBeNull();
  });

  it("無限大の座標では null を返すこと", () => {
    expect(
      getGridIndexFromPosition(Number.POSITIVE_INFINITY, 0),
    ).toBeNull();
  });
});
