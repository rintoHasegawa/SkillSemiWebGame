/**
 * bombHit.logic.test
 * 爆弾とプレイヤーの円当たり判定を検証する
 * 同チーム除外・未確定teamIdの扱い・境界距離・半径0や負値の扱いを検証する
 */
import { describe, expect, it } from "vitest";

import { UNKNOWN_TEAM_ID } from "../../../config/gameConfig";
import type { TeamCollisionCircle } from "./bombHit.type";
import { checkBombHit } from "./bombHit.logic";

const createBomb = (
  overrides: Partial<TeamCollisionCircle> = {},
): TeamCollisionCircle => ({
  x: 0,
  y: 0,
  radius: 1.5,
  teamId: 0,
  ...overrides,
});

const createPlayer = (
  overrides: Partial<TeamCollisionCircle> = {},
): TeamCollisionCircle => ({
  x: 0,
  y: 0,
  radius: 0.5,
  teamId: 1,
  ...overrides,
});

describe("checkBombHit", () => {
  it("敵チームのプレイヤーが爆風内にいる場合に命中と判定すること", () => {
    const result = checkBombHit({
      bomb: createBomb(),
      player: createPlayer({ x: 1, y: 0 }),
    });

    expect(result.isHit).toBe(true);
  });

  it("敵チームのプレイヤーが爆風外にいる場合に命中と判定しないこと", () => {
    const result = checkBombHit({
      bomb: createBomb(),
      player: createPlayer({ x: 3, y: 0 }),
    });

    expect(result.isHit).toBe(false);
  });

  it("同チームのプレイヤーが重なっていても命中と判定しないこと", () => {
    const result = checkBombHit({
      bomb: createBomb({ teamId: 2 }),
      player: createPlayer({ teamId: 2 }),
    });

    expect(result.isHit).toBe(false);
  });

  it("同チームの場合に isSameTeam を true として返すこと", () => {
    const result = checkBombHit({
      bomb: createBomb({ teamId: 2 }),
      player: createPlayer({ teamId: 2 }),
    });

    expect(result.isSameTeam).toBe(true);
  });

  it("敵チームの場合に isSameTeam を false として返すこと", () => {
    const result = checkBombHit({
      bomb: createBomb({ teamId: 0 }),
      player: createPlayer({ teamId: 3 }),
    });

    expect(result.isSameTeam).toBe(false);
  });

  it("同チームでも距離の二乗を計算して返すこと", () => {
    const result = checkBombHit({
      bomb: createBomb({ teamId: 1 }),
      player: createPlayer({ x: 3, y: 4, teamId: 1 }),
    });

    expect(result.distanceSquared).toBe(25);
  });

  it("半径の和の二乗をしきい値として返すこと", () => {
    const result = checkBombHit({
      bomb: createBomb({ radius: 1.5 }),
      player: createPlayer({ radius: 0.5 }),
    });

    expect(result.thresholdSquared).toBe(4);
  });

  it("距離がちょうど半径の和と等しい場合は命中と判定しないこと", () => {
    const result = checkBombHit({
      bomb: createBomb(),
      player: createPlayer({ x: 2, y: 0 }),
    });

    expect(result.distanceSquared).toBe(result.thresholdSquared);
    expect(result.isHit).toBe(false);
  });

  it("距離が半径の和をわずかに下回る場合は命中と判定すること", () => {
    const result = checkBombHit({
      bomb: createBomb(),
      player: createPlayer({ x: 1.999, y: 0 }),
    });

    expect(result.isHit).toBe(true);
  });

  it("距離が半径の和をわずかに上回る場合は命中と判定しないこと", () => {
    const result = checkBombHit({
      bomb: createBomb(),
      player: createPlayer({ x: 2.001, y: 0 }),
    });

    expect(result.isHit).toBe(false);
  });

  it("完全に同じ座標にいる敵チームを命中と判定すること", () => {
    const result = checkBombHit({
      bomb: createBomb(),
      player: createPlayer(),
    });

    expect(result.isHit).toBe(true);
    expect(result.distanceSquared).toBe(0);
  });

  it("負方向の座標差でも距離の二乗が正になること", () => {
    const result = checkBombHit({
      bomb: createBomb({ x: 0, y: 0 }),
      player: createPlayer({ x: -3, y: -4 }),
    });

    expect(result.distanceSquared).toBe(25);
  });

  it("斜め方向の距離を二乗和で評価すること", () => {
    const result = checkBombHit({
      bomb: createBomb({ radius: 1 }),
      player: createPlayer({ x: 1, y: 1, radius: 1 }),
    });

    expect(result.distanceSquared).toBe(2);
    expect(result.thresholdSquared).toBe(4);
    expect(result.isHit).toBe(true);
  });

  it("両者の半径が 0 で同座標の場合は命中と判定しないこと", () => {
    const result = checkBombHit({
      bomb: createBomb({ radius: 0 }),
      player: createPlayer({ radius: 0 }),
    });

    expect(result.thresholdSquared).toBe(0);
    expect(result.isHit).toBe(false);
  });

  it("半径の和が負でも二乗によりしきい値が正になること", () => {
    const result = checkBombHit({
      bomb: createBomb({ radius: -1 }),
      player: createPlayer({ radius: -1 }),
    });

    expect(result.thresholdSquared).toBe(4);
    expect(result.isHit).toBe(true);
  });

  it("双方の teamId が未確定（-1）の場合は同チームと判定しないこと", () => {
    const result = checkBombHit({
      bomb: createBomb({ teamId: UNKNOWN_TEAM_ID }),
      player: createPlayer({ teamId: UNKNOWN_TEAM_ID }),
    });

    expect(result.isSameTeam).toBe(false);
  });

  it("双方の teamId が未確定（-1）でも爆風内なら命中と判定すること", () => {
    const result = checkBombHit({
      bomb: createBomb({ teamId: UNKNOWN_TEAM_ID }),
      player: createPlayer({ x: 1, y: 0, teamId: UNKNOWN_TEAM_ID }),
    });

    expect(result.isHit).toBe(true);
  });

  it("爆弾の teamId のみ未確定（-1）の場合は同チームと判定しないこと", () => {
    const result = checkBombHit({
      bomb: createBomb({ teamId: UNKNOWN_TEAM_ID }),
      player: createPlayer({ teamId: 0 }),
    });

    expect(result.isSameTeam).toBe(false);
    expect(result.isHit).toBe(true);
  });

  it("プレイヤーの teamId のみ未確定（-1）の場合は同チームと判定しないこと", () => {
    const result = checkBombHit({
      bomb: createBomb({ teamId: 0 }),
      player: createPlayer({ teamId: UNKNOWN_TEAM_ID }),
    });

    expect(result.isSameTeam).toBe(false);
    expect(result.isHit).toBe(true);
  });

  it("teamId が未確定（-1）でも爆風外なら命中と判定しないこと", () => {
    const result = checkBombHit({
      bomb: createBomb({ teamId: UNKNOWN_TEAM_ID }),
      player: createPlayer({ x: 3, y: 0, teamId: UNKNOWN_TEAM_ID }),
    });

    expect(result.isHit).toBe(false);
  });

  it("有効な teamId が一致する場合は従来どおり同チームと判定すること", () => {
    const result = checkBombHit({
      bomb: createBomb({ teamId: 0 }),
      player: createPlayer({ teamId: 0 }),
    });

    expect(result.isSameTeam).toBe(true);
    expect(result.isHit).toBe(false);
  });

  it("座標が NaN の場合は命中と判定しないこと", () => {
    const result = checkBombHit({
      bomb: createBomb(),
      player: createPlayer({ x: Number.NaN }),
    });

    expect(result.distanceSquared).toBeNaN();
    expect(result.isHit).toBe(false);
  });
});
