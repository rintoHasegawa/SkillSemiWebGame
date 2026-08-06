/**
 * BotHitStunPolicy.test
 * Bot被弾硬直ポリシーの現行挙動を固定する characterization test
 * 硬直判定の境界と硬直終了時刻の伸長規則を検証する
 */
import { describe, expect, it } from "vitest";

import { BotHitStunPolicy } from "./BotHitStunPolicy";

describe("BotHitStunPolicy", () => {
  it("現在時刻が硬直終了前なら硬直中と判定すること", () => {
    const policy = new BotHitStunPolicy({ hitStunMs: 1_000 });

    expect(policy.isStunned(999, 1_000)).toBe(true);
  });

  it("現在時刻が硬直終了時刻と等しい場合は硬直中でないこと", () => {
    const policy = new BotHitStunPolicy({ hitStunMs: 1_000 });

    expect(policy.isStunned(1_000, 1_000)).toBe(false);
  });

  it("硬直終了時刻を過ぎている場合は硬直中でないこと", () => {
    const policy = new BotHitStunPolicy({ hitStunMs: 1_000 });

    expect(policy.isStunned(1_001, 1_000)).toBe(false);
  });

  it("被弾時刻に硬直時間を加えた時刻を返すこと", () => {
    const policy = new BotHitStunPolicy({ hitStunMs: 1_000 });

    expect(policy.calculateNextStunUntilMs(0, 5_000)).toBe(6_000);
  });

  it("既存の硬直終了時刻の方が遅い場合はそれを維持すること", () => {
    const policy = new BotHitStunPolicy({ hitStunMs: 1_000 });

    expect(policy.calculateNextStunUntilMs(9_000, 5_000)).toBe(9_000);
  });

  it("硬直時間0の場合は被弾時刻をそのまま返すこと", () => {
    const policy = new BotHitStunPolicy({ hitStunMs: 0 });

    expect(policy.calculateNextStunUntilMs(0, 5_000)).toBe(5_000);
  });
});
