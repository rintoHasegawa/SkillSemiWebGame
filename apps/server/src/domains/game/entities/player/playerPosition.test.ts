/**
 * playerPosition.test
 * プレイヤー座標からグリッドインデックスを解決する仕様を検証するユニットテスト
 * サイズ指定の有無と，範囲外・非有限座標の境界条件を検証する
 */
import { describe, expect, it } from "vitest";

import { config } from "@server/config";

import { Player } from "./Player";
import { getPlayerGridIndex } from "./playerPosition";

const { GRID_COLS, GRID_ROWS } = config.GAME_CONFIG;

/** 指定座標のプレイヤーを生成する */
const createPlayerAt = (x: number, y: number): Player => {
  const player = new Player("socket-1", "たろう", 0);
  player.x = x;
  player.y = y;
  return player;
};

describe("getPlayerGridIndex（サイズ指定あり）", () => {
  const size = { gridCols: 4, gridRows: 3 };

  it("原点のプレイヤーはインデックス0を返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(0, 0), size)).toBe(0);
  });

  it("行と列からrow*gridCols+colのインデックスを返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(2, 1), size)).toBe(6);
  });

  it("小数座標は切り捨てて同じセルへ解決すること", () => {
    expect(getPlayerGridIndex(createPlayerAt(2.99, 1.99), size)).toBe(6);
  });

  it("右下端の内側座標は最終インデックスを返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(3.999, 2.999), size)).toBe(11);
  });

  it("x座標が列数と等しい場合はnullを返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(4, 0), size)).toBeNull();
  });

  it("y座標が行数と等しい場合はnullを返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(0, 3), size)).toBeNull();
  });

  it("x座標が負の場合はnullを返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(-0.1, 0), size)).toBeNull();
  });

  it("y座標が負の場合はnullを返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(0, -0.1), size)).toBeNull();
  });

  it("-0の座標では符号付きゼロ（-0）のインデックスを返すこと", () => {
    const result = getPlayerGridIndex(createPlayerAt(-0, -0), size);

    expect(Object.is(result, -0)).toBe(true);
  });

  it("x座標がInfinityの場合はnullを返すこと", () => {
    const player = createPlayerAt(Number.POSITIVE_INFINITY, 0);

    expect(getPlayerGridIndex(player, size)).toBeNull();
  });

  it("y座標が-Infinityの場合はnullを返すこと", () => {
    const player = createPlayerAt(0, Number.NEGATIVE_INFINITY);

    expect(getPlayerGridIndex(player, size)).toBeNull();
  });

  it("x座標がNaNの場合はnullを返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(Number.NaN, 0), size)).toBeNull();
  });

  it("y座標がNaNの場合はnullを返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(0, Number.NaN), size)).toBeNull();
  });

  it("列数0のサイズではすべての座標でnullを返すこと", () => {
    const player = createPlayerAt(0, 0);

    expect(getPlayerGridIndex(player, { gridCols: 0, gridRows: 3 })).toBeNull();
  });

  it("行数0のサイズではすべての座標でnullを返すこと", () => {
    const player = createPlayerAt(0, 0);

    expect(getPlayerGridIndex(player, { gridCols: 4, gridRows: 0 })).toBeNull();
  });

  it("1x1のサイズでは原点のみインデックス0を返すこと", () => {
    const player = createPlayerAt(0.5, 0.5);

    expect(getPlayerGridIndex(player, { gridCols: 1, gridRows: 1 })).toBe(0);
  });

  it("プレイヤーの座標を変更しないこと", () => {
    const player = createPlayerAt(2.5, 1.5);
    getPlayerGridIndex(player, size);

    expect([player.x, player.y]).toEqual([2.5, 1.5]);
  });
});

describe("getPlayerGridIndex（サイズ指定なし）", () => {
  it("サイズ未指定の場合はconfigの既定グリッドで解決すること", () => {
    expect(getPlayerGridIndex(createPlayerAt(2, 1))).toBe(GRID_COLS + 2);
  });

  it("undefinedを渡した場合も既定グリッドで解決すること", () => {
    expect(getPlayerGridIndex(createPlayerAt(2, 1), undefined)).toBe(
      GRID_COLS + 2,
    );
  });

  it("既定グリッドの原点はインデックス0を返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(0, 0))).toBe(0);
  });

  it("既定グリッドの最終セルは総セル数-1を返すこと", () => {
    const player = createPlayerAt(GRID_COLS - 1, GRID_ROWS - 1);

    expect(getPlayerGridIndex(player)).toBe(GRID_COLS * GRID_ROWS - 1);
  });

  it("既定グリッドの列数と等しいx座標ではnullを返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(GRID_COLS, 0))).toBeNull();
  });

  it("既定グリッドの行数と等しいy座標ではnullを返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(0, GRID_ROWS))).toBeNull();
  });

  it("既定グリッドでも負の座標ではnullを返すこと", () => {
    expect(getPlayerGridIndex(createPlayerAt(-1, -1))).toBeNull();
  });

  it("既定グリッドでもNaN座標ではnullを返すこと", () => {
    expect(
      getPlayerGridIndex(createPlayerAt(Number.NaN, Number.NaN)),
    ).toBeNull();
  });
});
