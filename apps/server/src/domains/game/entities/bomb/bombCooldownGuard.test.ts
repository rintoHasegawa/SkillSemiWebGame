/**
 * bombCooldownGuard.test
 * 爆弾設置のサーバー側クールダウン判定の仕様を検証するユニットテスト
 * 許容誤差込みの境界値・プレイヤー独立性・非有限時刻の防御を検証する
 */
import { describe, expect, it } from "vitest";

import {
  BOMB_COOLDOWN_TOLERANCE_MS,
  shouldAcceptBombPlacement,
} from "./bombCooldownGuard";

const COOLDOWN_MS = 4_000;

describe("shouldAcceptBombPlacement", () => {
  it("初回の設置要求はtrueを返すこと", () => {
    const lastAcceptedAtMsByPlayerId = new Map<string, number>();

    expect(
      shouldAcceptBombPlacement({
        lastAcceptedAtMsByPlayerId,
        playerId: "player-1",
        nowMs: 1_000,
        cooldownMs: COOLDOWN_MS,
      }),
    ).toBe(true);
  });

  it("受理時は直近受理時刻を記録すること", () => {
    const lastAcceptedAtMsByPlayerId = new Map<string, number>();

    shouldAcceptBombPlacement({
      lastAcceptedAtMsByPlayerId,
      playerId: "player-1",
      nowMs: 1_000,
      cooldownMs: COOLDOWN_MS,
    });

    expect(lastAcceptedAtMsByPlayerId.get("player-1")).toBe(1_000);
  });

  it("クールダウン未経過の再設置はfalseを返すこと", () => {
    const lastAcceptedAtMsByPlayerId = new Map<string, number>([
      ["player-1", 1_000],
    ]);

    expect(
      shouldAcceptBombPlacement({
        lastAcceptedAtMsByPlayerId,
        playerId: "player-1",
        nowMs: 1_100,
        cooldownMs: COOLDOWN_MS,
      }),
    ).toBe(false);
  });

  it("拒否時は直近受理時刻を更新しないこと", () => {
    const lastAcceptedAtMsByPlayerId = new Map<string, number>([
      ["player-1", 1_000],
    ]);

    shouldAcceptBombPlacement({
      lastAcceptedAtMsByPlayerId,
      playerId: "player-1",
      nowMs: 1_100,
      cooldownMs: COOLDOWN_MS,
    });

    expect(lastAcceptedAtMsByPlayerId.get("player-1")).toBe(1_000);
  });

  it("クールダウン経過後の再設置はtrueを返すこと", () => {
    const lastAcceptedAtMsByPlayerId = new Map<string, number>([
      ["player-1", 1_000],
    ]);

    expect(
      shouldAcceptBombPlacement({
        lastAcceptedAtMsByPlayerId,
        playerId: "player-1",
        nowMs: 1_000 + COOLDOWN_MS,
        cooldownMs: COOLDOWN_MS,
      }),
    ).toBe(true);
  });

  it("許容誤差ぶん早い再設置はtrueを返すこと", () => {
    const lastAcceptedAtMsByPlayerId = new Map<string, number>([
      ["player-1", 1_000],
    ]);

    expect(
      shouldAcceptBombPlacement({
        lastAcceptedAtMsByPlayerId,
        playerId: "player-1",
        nowMs: 1_000 + COOLDOWN_MS - BOMB_COOLDOWN_TOLERANCE_MS,
        cooldownMs: COOLDOWN_MS,
      }),
    ).toBe(true);
  });

  it("許容誤差を1ms超えて早い再設置はfalseを返すこと", () => {
    const lastAcceptedAtMsByPlayerId = new Map<string, number>([
      ["player-1", 1_000],
    ]);

    expect(
      shouldAcceptBombPlacement({
        lastAcceptedAtMsByPlayerId,
        playerId: "player-1",
        nowMs: 1_000 + COOLDOWN_MS - BOMB_COOLDOWN_TOLERANCE_MS - 1,
        cooldownMs: COOLDOWN_MS,
      }),
    ).toBe(false);
  });

  it("許容誤差はクールダウンより十分小さいこと", () => {
    expect(BOMB_COOLDOWN_TOLERANCE_MS).toBeGreaterThan(0);
    expect(BOMB_COOLDOWN_TOLERANCE_MS).toBeLessThan(COOLDOWN_MS / 2);
  });

  it("別プレイヤーのクールダウンは独立して判定すること", () => {
    const lastAcceptedAtMsByPlayerId = new Map<string, number>([
      ["player-1", 1_000],
    ]);

    expect(
      shouldAcceptBombPlacement({
        lastAcceptedAtMsByPlayerId,
        playerId: "player-2",
        nowMs: 1_100,
        cooldownMs: COOLDOWN_MS,
      }),
    ).toBe(true);
  });

  it("現在時刻が非有限の場合はfalseを返すこと", () => {
    const lastAcceptedAtMsByPlayerId = new Map<string, number>();

    expect(
      shouldAcceptBombPlacement({
        lastAcceptedAtMsByPlayerId,
        playerId: "player-1",
        nowMs: Number.NaN,
        cooldownMs: COOLDOWN_MS,
      }),
    ).toBe(false);
  });

  it("現在時刻が非有限の場合は直近受理時刻を記録しないこと", () => {
    const lastAcceptedAtMsByPlayerId = new Map<string, number>();

    shouldAcceptBombPlacement({
      lastAcceptedAtMsByPlayerId,
      playerId: "player-1",
      nowMs: Number.POSITIVE_INFINITY,
      cooldownMs: COOLDOWN_MS,
    });

    expect(lastAcceptedAtMsByPlayerId.has("player-1")).toBe(false);
  });
});
