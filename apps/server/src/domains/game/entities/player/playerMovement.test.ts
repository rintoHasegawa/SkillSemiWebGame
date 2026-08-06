/**
 * playerMovement.test
 * プレイヤー座標の検証と更新処理の現行挙動を固定する characterization test
 * 有限数判定の境界値と，座標更新が検証・クランプを行わないことを検証する
 */
import { describe, expect, it } from "vitest";

import { Player } from "./Player";
import { isValidPosition, setPlayerPosition } from "./playerMovement";

/** テスト用のプレイヤーを生成する */
const createPlayer = (): Player => new Player("socket-1", "たろう", 0);

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
    setPlayerPosition(player, 3.25, 0);

    expect(player.x).toBe(3.25);
  });

  it("プレイヤーのyを指定値へ更新すること", () => {
    const player = createPlayer();
    setPlayerPosition(player, 0, 7.75);

    expect(player.y).toBe(7.75);
  });

  it("戻り値を返さないこと", () => {
    expect(setPlayerPosition(createPlayer(), 1, 2)).toBeUndefined();
  });

  it("負の座標をクランプせずそのまま設定すること", () => {
    const player = createPlayer();
    setPlayerPosition(player, -5, -10);

    expect([player.x, player.y]).toEqual([-5, -10]);
  });

  it("マップ範囲外の座標もクランプせずそのまま設定すること", () => {
    const player = createPlayer();
    setPlayerPosition(player, 100000, 100000);

    expect([player.x, player.y]).toEqual([100000, 100000]);
  });

  it("NaNをisValidPositionで検証せずそのまま設定すること", () => {
    const player = createPlayer();
    setPlayerPosition(player, Number.NaN, Number.NaN);

    expect([Number.isNaN(player.x), Number.isNaN(player.y)]).toEqual([
      true,
      true,
    ]);
  });

  it("Infinityも検証せずそのまま設定すること", () => {
    const player = createPlayer();
    setPlayerPosition(player, Number.POSITIVE_INFINITY, 0);

    expect(player.x).toBe(Number.POSITIVE_INFINITY);
  });

  it("initialXを変更しないこと", () => {
    const player = createPlayer();
    player.initialX = 12;
    setPlayerPosition(player, 1, 2);

    expect(player.initialX).toBe(12);
  });

  it("initialYを変更しないこと", () => {
    const player = createPlayer();
    player.initialY = 34;
    setPlayerPosition(player, 1, 2);

    expect(player.initialY).toBe(34);
  });

  it("teamIdを変更しないこと", () => {
    const player = new Player("socket-1", "たろう", 3);
    setPlayerPosition(player, 1, 2);

    expect(player.teamId).toBe(3);
  });

  it("連続で呼び出すと最後の値が反映されること", () => {
    const player = createPlayer();
    setPlayerPosition(player, 1, 1);
    setPlayerPosition(player, 2, 2);

    expect([player.x, player.y]).toEqual([2, 2]);
  });

  it("同じ値で呼び出しても座標が変わらないこと", () => {
    const player = createPlayer();
    setPlayerPosition(player, 5, 5);
    setPlayerPosition(player, 5, 5);

    expect([player.x, player.y]).toEqual([5, 5]);
  });
});
