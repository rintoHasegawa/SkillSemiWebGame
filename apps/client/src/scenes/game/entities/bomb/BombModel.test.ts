/**
 * BombModel.test
 * 爆弾の導火線ゲージ残り比率の算出仕様を検証する
 * ゲームループ経過msを基準とした正規化・0〜1クランプ・armed以外での非表示を検証する
 */
import { describe, expect, it } from "vitest";

import { config } from "@client/config";

import { BombModel } from "./BombModel";

const { BOMB_FUSE_MS } = config.GAME_CONFIG;

// 爆発時刻を固定したモデルを生成する
const EXPLODE_AT_MS = 10_000;
const PLACED_AT_MS = EXPLODE_AT_MS - BOMB_FUSE_MS;

const createBomb = (): BombModel => {
  return new BombModel({
    x: 3,
    y: 4,
    radiusGrid: 2,
    explodeAtElapsedMs: EXPLODE_AT_MS,
    teamId: 1,
    color: 0x4b4bff,
  });
};

describe("BombModel.getFuseRemainingRatio", () => {
  it("設置直後は残り比率が1になること", () => {
    const bomb = createBomb();

    expect(bomb.getFuseRemainingRatio(PLACED_AT_MS)).toBe(1);
  });

  it("導火線の半分が経過した時点で残り比率が0.5になること", () => {
    const bomb = createBomb();

    expect(bomb.getFuseRemainingRatio(PLACED_AT_MS + BOMB_FUSE_MS / 2)).toBe(
      0.5,
    );
  });

  it("爆発時刻ちょうどで残り比率が0になること", () => {
    const bomb = createBomb();

    expect(bomb.getFuseRemainingRatio(EXPLODE_AT_MS)).toBe(0);
  });

  it("爆発時刻を過ぎた経過msでは残り比率を0にクランプすること", () => {
    const bomb = createBomb();

    expect(bomb.getFuseRemainingRatio(EXPLODE_AT_MS + BOMB_FUSE_MS)).toBe(0);
  });

  it("設置時刻より過去の経過msでは残り比率を1にクランプすること", () => {
    const bomb = createBomb();

    expect(bomb.getFuseRemainingRatio(PLACED_AT_MS - BOMB_FUSE_MS)).toBe(1);
  });

  it("armedのままなら経過に応じて残り比率が単調に減ること", () => {
    const bomb = createBomb();

    const earlier = bomb.getFuseRemainingRatio(PLACED_AT_MS + 200);
    const later = bomb.getFuseRemainingRatio(PLACED_AT_MS + 600);

    expect(later).toBeLessThan(earlier);
  });

  it("explodedへ遷移した後は残り比率が0になること", () => {
    const bomb = createBomb();

    bomb.update(EXPLODE_AT_MS);

    expect(bomb.getState()).toBe("exploded");
    expect(bomb.getFuseRemainingRatio(PLACED_AT_MS + BOMB_FUSE_MS / 2)).toBe(0);
  });

  it("finishedへ遷移した後は残り比率が0になること", () => {
    const bomb = createBomb();

    bomb.update(EXPLODE_AT_MS);
    bomb.update(EXPLODE_AT_MS + 1_000);

    expect(bomb.getState()).toBe("finished");
    expect(bomb.getFuseRemainingRatio(PLACED_AT_MS + BOMB_FUSE_MS / 2)).toBe(0);
  });
});
