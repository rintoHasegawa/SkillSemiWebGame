/**
 * bombCooldown.test
 * 爆弾クールダウン解決の仕様を検証するユニットテスト
 * SPEC_03（通常4000ms／フィーバー時2000ms，残り60秒以下でフィーバー）を基準に境界値を検証する
 */
import { describe, expect, it } from "vitest";

import { resolveBombCooldownMs } from "./bombCooldown";

// SPEC_03「ボム設置」のクールダウン仕様に基づく期待値
const NORMAL_COOLDOWN_MS = 4_000;
const FEVER_COOLDOWN_MS = 2_000;

// SPEC_03「タイムライン」: 制限時間180秒のうち経過120秒（残り60秒）でフィーバー開始
const FEVER_START_ELAPSED_MS = 120_000;
const GAME_END_ELAPSED_MS = 180_000;

describe("resolveBombCooldownMs", () => {
  it("ゲーム開始直後は通常クールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(0)).toBe(NORMAL_COOLDOWN_MS);
  });

  it("通常フェーズの途中は通常クールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(60_000)).toBe(NORMAL_COOLDOWN_MS);
  });

  it("フィーバー開始の1ms手前は通常クールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(FEVER_START_ELAPSED_MS - 1)).toBe(
      NORMAL_COOLDOWN_MS,
    );
  });

  it("残り60秒ちょうどはフィーバークールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(FEVER_START_ELAPSED_MS)).toBe(
      FEVER_COOLDOWN_MS,
    );
  });

  it("フィーバー開始後はフィーバークールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(FEVER_START_ELAPSED_MS + 30_000)).toBe(
      FEVER_COOLDOWN_MS,
    );
  });

  it("制限時間ちょうどはフィーバークールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(GAME_END_ELAPSED_MS)).toBe(FEVER_COOLDOWN_MS);
  });

  it("制限時間を超えた経過時間でもフィーバークールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(GAME_END_ELAPSED_MS + 60_000)).toBe(
      FEVER_COOLDOWN_MS,
    );
  });

  it("負の経過時間は通常クールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(-1_000)).toBe(NORMAL_COOLDOWN_MS);
  });

  it("非数の経過時間は通常クールダウンへフォールバックすること", () => {
    expect(resolveBombCooldownMs(Number.NaN)).toBe(NORMAL_COOLDOWN_MS);
  });

  it("負の無限大の経過時間は通常クールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(Number.NEGATIVE_INFINITY)).toBe(
      NORMAL_COOLDOWN_MS,
    );
  });

  it("正の無限大の経過時間はフィーバークールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(Number.POSITIVE_INFINITY)).toBe(
      FEVER_COOLDOWN_MS,
    );
  });

  it("フィーバー境界の前後でクールダウンが短縮されること", () => {
    expect(
      resolveBombCooldownMs(FEVER_START_ELAPSED_MS - 1) -
        resolveBombCooldownMs(FEVER_START_ELAPSED_MS),
    ).toBe(NORMAL_COOLDOWN_MS - FEVER_COOLDOWN_MS);
  });
});
