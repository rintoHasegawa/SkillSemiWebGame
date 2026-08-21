/**
 * playerMovement.test
 * プレイヤー座標の検証と更新処理の仕様を検証するユニットテスト
 * 有限数判定の境界値と，非有限座標の無視・マップ境界クランプを検証する
 */
import { describe, expect, it } from "vitest";

import { config } from "@server/config";

import { createPlayerEntity } from "@server/testing/playerFixtures";
import { Player } from "./Player";
import { isValidPosition, setPlayerPosition } from "./playerMovement";

/** テスト用のプレイヤーを生成する */
const createPlayer = (): Player => createPlayerEntity({ name: "たろう" });

// 仕様（SPEC_03 プレイヤー半径 0.5 グリッド）に基づく境界値
const RADIUS = config.GAME_CONFIG.PLAYER_RADIUS;
const TEST_MAP = { gridCols: 10, gridRows: 10 };

describe("isValidPosition", () => {
  it("有限数の組み合わせではtrueを返すこと", () => {
    expect(isValidPosition(1.5, 2.5)).toBe(true);
  });

  it("原点（0,0）ではtrueを返すこと", () => {
    expect(isValidPosition(0, 0)).toBe(true);
  });

  it("負の座標でもtrueを返すこと", () => {
    expect(isValidPosition(-100, -100)).toBe(true);
  });

  it("マップ範囲外の大きな座標でも範囲判定はせずtrueを返すこと", () => {
    expect(isValidPosition(99999, 99999)).toBe(true);
  });

  it("Number.MAX_VALUEではtrueを返すこと", () => {
    expect(isValidPosition(Number.MAX_VALUE, Number.MAX_VALUE)).toBe(true);
  });

  it("Number.MIN_VALUEではtrueを返すこと", () => {
    expect(isValidPosition(Number.MIN_VALUE, Number.MIN_VALUE)).toBe(true);
  });

  it("-0でもtrueを返すこと", () => {
    expect(isValidPosition(-0, -0)).toBe(true);
  });

  it("xがNaNの場合はfalseを返すこと", () => {
    expect(isValidPosition(Number.NaN, 0)).toBe(false);
  });

  it("yがNaNの場合はfalseを返すこと", () => {
    expect(isValidPosition(0, Number.NaN)).toBe(false);
  });

  it("xがInfinityの場合はfalseを返すこと", () => {
    expect(isValidPosition(Number.POSITIVE_INFINITY, 0)).toBe(false);
  });

  it("yがInfinityの場合はfalseを返すこと", () => {
    expect(isValidPosition(0, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("xが-Infinityの場合はfalseを返すこと", () => {
    expect(isValidPosition(Number.NEGATIVE_INFINITY, 0)).toBe(false);
  });

  it("yが-Infinityの場合はfalseを返すこと", () => {
    expect(isValidPosition(0, Number.NEGATIVE_INFINITY)).toBe(false);
  });

  it("xとyがともに非有限の場合はfalseを返すこと", () => {
    expect(isValidPosition(Number.NaN, Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("setPlayerPosition", () => {
  it("プレイヤーのxを指定値へ更新すること", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: 3.25, y: 0.5, mapSize: TEST_MAP });

    expect(player.x).toBe(3.25);
  });

  it("プレイヤーのyを指定値へ更新すること", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: 0.5, y: 7.75, mapSize: TEST_MAP });

    expect(player.y).toBe(7.75);
  });

  it("戻り値を返さないこと", () => {
    expect(
      setPlayerPosition({ player: createPlayer(), x: 1, y: 2 }),
    ).toBeUndefined();
  });

  it("マップ下限ちょうどの座標をそのまま設定すること", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: RADIUS, y: RADIUS, mapSize: TEST_MAP });

    expect([player.x, player.y]).toEqual([RADIUS, RADIUS]);
  });

  it("マップ上限ちょうどの座標をそのまま設定すること", () => {
    const player = createPlayer();
    const limit = TEST_MAP.gridCols - RADIUS;
    setPlayerPosition({ player, x: limit, y: limit, mapSize: TEST_MAP });

    expect([player.x, player.y]).toEqual([limit, limit]);
  });

  it("負の座標をマップ下限へクランプすること", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: -5, y: -10, mapSize: TEST_MAP });

    expect([player.x, player.y]).toEqual([RADIUS, RADIUS]);
  });

  it("マップ範囲外の座標をマップ上限へクランプすること", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: 100000, y: 100000, mapSize: TEST_MAP });

    expect([player.x, player.y]).toEqual([
      TEST_MAP.gridCols - RADIUS,
      TEST_MAP.gridRows - RADIUS,
    ]);
  });

  it("非正方マップではx軸とy軸を独立にクランプすること", () => {
    const player = createPlayer();
    setPlayerPosition({
      player,
      x: 100,
      y: 100,
      mapSize: { gridCols: 8, gridRows: 20 },
    });

    expect([player.x, player.y]).toEqual([8 - RADIUS, 20 - RADIUS]);
  });

  it("mapSize省略時は既定グリッドの上限へクランプすること", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: 100000, y: 100000 });

    expect([player.x, player.y]).toEqual([
      config.GAME_CONFIG.GRID_COLS - RADIUS,
      config.GAME_CONFIG.GRID_ROWS - RADIUS,
    ]);
  });

  it("mapSize省略時は既定グリッドの下限へクランプすること", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: -1, y: -1 });

    expect([player.x, player.y]).toEqual([RADIUS, RADIUS]);
  });

  it("xがNaNの場合は座標を更新せず直前の位置を維持すること", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: 4, y: 4, mapSize: TEST_MAP });
    setPlayerPosition({ player, x: Number.NaN, y: 6, mapSize: TEST_MAP });

    expect([player.x, player.y]).toEqual([4, 4]);
  });

  it("yがNaNの場合は座標を更新せず直前の位置を維持すること", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: 4, y: 4, mapSize: TEST_MAP });
    setPlayerPosition({ player, x: 6, y: Number.NaN, mapSize: TEST_MAP });

    expect([player.x, player.y]).toEqual([4, 4]);
  });

  it("Infinityの場合は座標を更新せず直前の位置を維持すること", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: 4, y: 4, mapSize: TEST_MAP });
    setPlayerPosition({
      player,
      x: Number.POSITIVE_INFINITY,
      y: 4,
      mapSize: TEST_MAP,
    });

    expect([player.x, player.y]).toEqual([4, 4]);
  });

  it("-Infinityの場合は座標を更新せず直前の位置を維持すること", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: 4, y: 4, mapSize: TEST_MAP });
    setPlayerPosition({
      player,
      x: 4,
      y: Number.NEGATIVE_INFINITY,
      mapSize: TEST_MAP,
    });

    expect([player.x, player.y]).toEqual([4, 4]);
  });

  it("非有限座標を設定してもNaNが座標に混入しないこと", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: Number.NaN, y: Number.NaN });

    expect(Number.isFinite(player.x) && Number.isFinite(player.y)).toBe(true);
  });

  it("initialXを変更しないこと", () => {
    const player = createPlayer();
    player.initialX = 12;
    setPlayerPosition({ player, x: 1, y: 2, mapSize: TEST_MAP });

    expect(player.initialX).toBe(12);
  });

  it("initialYを変更しないこと", () => {
    const player = createPlayer();
    player.initialY = 34;
    setPlayerPosition({ player, x: 1, y: 2, mapSize: TEST_MAP });

    expect(player.initialY).toBe(34);
  });

  it("teamIdを変更しないこと", () => {
    const player = new Player("socket-1", "たろう", 3);
    setPlayerPosition({ player, x: 1, y: 2, mapSize: TEST_MAP });

    expect(player.teamId).toBe(3);
  });

  it("連続で呼び出すと最後の値が反映されること", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: 1, y: 1, mapSize: TEST_MAP });
    setPlayerPosition({ player, x: 2, y: 2, mapSize: TEST_MAP });

    expect([player.x, player.y]).toEqual([2, 2]);
  });

  it("同じ値で呼び出しても座標が変わらないこと", () => {
    const player = createPlayer();
    setPlayerPosition({ player, x: 5, y: 5, mapSize: TEST_MAP });
    setPlayerPosition({ player, x: 5, y: 5, mapSize: TEST_MAP });

    expect([player.x, player.y]).toEqual([5, 5]);
  });
});
