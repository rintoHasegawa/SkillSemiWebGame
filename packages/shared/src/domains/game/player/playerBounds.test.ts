/**
 * playerBounds.test
 * プレイヤー座標のマップ境界クランプ仕様を検証するユニットテスト
 * プレイヤー円（半径0.5グリッド）がマップ内に収まることを基準に境界値を検証する
 */
import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "../../../config/gameConfig";
import { clampPositionToMapBounds } from "./playerBounds";

// 仕様（SPEC_03 プレイヤー半径 0.5 グリッド）に基づく境界値
const RADIUS = GAME_CONFIG.PLAYER_RADIUS;
const SQUARE_MAP = { gridCols: 10, gridRows: 10 };

describe("clampPositionToMapBounds", () => {
  it("マップ中央の座標をそのまま返すこと", () => {
    expect(clampPositionToMapBounds({ x: 5, y: 5 }, SQUARE_MAP)).toEqual({
      x: 5,
      y: 5,
    });
  });

  it("下限ちょうど（半径と同値）の座標をそのまま返すこと", () => {
    expect(
      clampPositionToMapBounds({ x: RADIUS, y: RADIUS }, SQUARE_MAP),
    ).toEqual({ x: RADIUS, y: RADIUS });
  });

  it("上限ちょうど（マップ幅-半径）の座標をそのまま返すこと", () => {
    const limit = SQUARE_MAP.gridCols - RADIUS;

    expect(clampPositionToMapBounds({ x: limit, y: limit }, SQUARE_MAP)).toEqual(
      { x: limit, y: limit },
    );
  });

  it("下限をわずかに下回る座標を下限へクランプすること", () => {
    expect(
      clampPositionToMapBounds({ x: RADIUS - 0.001, y: 5 }, SQUARE_MAP).x,
    ).toBe(RADIUS);
  });

  it("上限をわずかに上回る座標を上限へクランプすること", () => {
    const limit = SQUARE_MAP.gridCols - RADIUS;

    expect(
      clampPositionToMapBounds({ x: limit + 0.001, y: 5 }, SQUARE_MAP).x,
    ).toBe(limit);
  });

  it("負の座標を下限へクランプすること", () => {
    expect(clampPositionToMapBounds({ x: -100, y: -100 }, SQUARE_MAP)).toEqual({
      x: RADIUS,
      y: RADIUS,
    });
  });

  it("マップ幅を大きく超える座標を上限へクランプすること", () => {
    expect(clampPositionToMapBounds({ x: 999, y: 999 }, SQUARE_MAP)).toEqual({
      x: SQUARE_MAP.gridCols - RADIUS,
      y: SQUARE_MAP.gridRows - RADIUS,
    });
  });

  it("非正方マップではx軸とy軸を独立にクランプすること", () => {
    expect(
      clampPositionToMapBounds({ x: 50, y: 50 }, { gridCols: 8, gridRows: 20 }),
    ).toEqual({ x: 8 - RADIUS, y: 20 - RADIUS });
  });

  it("正の無限大の座標を上限へクランプすること", () => {
    expect(
      clampPositionToMapBounds(
        { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY },
        SQUARE_MAP,
      ),
    ).toEqual({
      x: SQUARE_MAP.gridCols - RADIUS,
      y: SQUARE_MAP.gridRows - RADIUS,
    });
  });

  it("負の無限大の座標を下限へクランプすること", () => {
    expect(
      clampPositionToMapBounds(
        { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY },
        SQUARE_MAP,
      ),
    ).toEqual({ x: RADIUS, y: RADIUS });
  });

  it("NaN座標でもマップ範囲内の有限座標を返すこと", () => {
    const clamped = clampPositionToMapBounds(
      { x: Number.NaN, y: Number.NaN },
      SQUARE_MAP,
    );

    expect(clamped.x).toBeGreaterThanOrEqual(RADIUS);
    expect(clamped.x).toBeLessThanOrEqual(SQUARE_MAP.gridCols - RADIUS);
  });

  it("マップサイズ省略時は既定グリッドの上限へクランプすること", () => {
    expect(clampPositionToMapBounds({ x: 9999, y: 9999 })).toEqual({
      x: GAME_CONFIG.GRID_COLS - RADIUS,
      y: GAME_CONFIG.GRID_ROWS - RADIUS,
    });
  });

  it("マップサイズ省略時は既定グリッドの下限へクランプすること", () => {
    expect(clampPositionToMapBounds({ x: -1, y: -1 })).toEqual({
      x: RADIUS,
      y: RADIUS,
    });
  });

  it("プレイヤー直径を収められない1マス幅のマップでは中央へ寄せること", () => {
    expect(
      clampPositionToMapBounds({ x: 99, y: 99 }, { gridCols: 1, gridRows: 1 }),
    ).toEqual({ x: 0.5, y: 0.5 });
  });

  it("マップサイズが0の場合でも有限座標を返すこと", () => {
    const clamped = clampPositionToMapBounds(
      { x: 5, y: 5 },
      { gridCols: 0, gridRows: 0 },
    );

    expect(Number.isFinite(clamped.x) && Number.isFinite(clamped.y)).toBe(true);
  });

  it("マップサイズが非有限の場合でも有限座標を返すこと", () => {
    const clamped = clampPositionToMapBounds(
      { x: 5, y: 5 },
      { gridCols: Number.NaN, gridRows: Number.POSITIVE_INFINITY },
    );

    expect(Number.isFinite(clamped.x) && Number.isFinite(clamped.y)).toBe(true);
  });

  it("引数の座標オブジェクトを変更しないこと", () => {
    const position = { x: 999, y: -999 };

    clampPositionToMapBounds(position, SQUARE_MAP);

    expect(position).toEqual({ x: 999, y: -999 });
  });
});
