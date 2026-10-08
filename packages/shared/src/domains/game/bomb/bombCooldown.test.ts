/**
 * bombCooldown.test
 * 爆弾クールダウン解決の仕様を検証するユニットテスト
 * SPEC_03（通常4000ms／フィーバー時2000ms，残り60秒以下でフィーバー）を基準に境界値を検証する
 * 試合時間を上書きした場合も「残り時間」基準のしきい値を保つこと（SPEC_03「試合時間の開発モード限定の上書き」）を検証する
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

// SPEC_03「試合時間の開発モード限定の上書き」: しきい値は残り時間基準のまま変えない
describe("resolveBombCooldownMs（試合時間を指定した場合）", () => {
  it("30秒の試合では開始直後からフィーバークールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(0, 30)).toBe(FEVER_COOLDOWN_MS);
  });

  it("60秒の試合では開始直後（残り60秒ちょうど）からフィーバークールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(0, 60)).toBe(FEVER_COOLDOWN_MS);
  });

  it("61秒の試合では開始直後は通常クールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(0, 61)).toBe(NORMAL_COOLDOWN_MS);
  });

  it("61秒の試合では残り60秒ちょうど（経過1秒）でフィーバークールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(1_000, 61)).toBe(FEVER_COOLDOWN_MS);
  });

  it("61秒の試合ではフィーバー開始の1ms手前は通常クールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(999, 61)).toBe(NORMAL_COOLDOWN_MS);
  });

  it("既定の180秒を明示した場合は開始直後に通常クールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(0, 180)).toBe(NORMAL_COOLDOWN_MS);
  });

  it("既定の180秒を明示した場合は残り60秒ちょうどでフィーバークールダウンを返すこと", () => {
    expect(resolveBombCooldownMs(FEVER_START_ELAPSED_MS, 180)).toBe(
      FEVER_COOLDOWN_MS,
    );
  });

  it("試合時間を省略した場合は180秒を指定した場合と同じ結果になること", () => {
    expect(resolveBombCooldownMs(FEVER_START_ELAPSED_MS - 1)).toBe(
      resolveBombCooldownMs(FEVER_START_ELAPSED_MS - 1, 180),
    );
  });
});
