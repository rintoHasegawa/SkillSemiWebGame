/**
 * BombPlacementPolicy.test
 * Bot爆弾設置判定の挙動を検証するユニットテスト
 * クールダウン境界（フィーバー短縮を含む）と確率判定の分岐を検証する
 * 判定軸はゲーム経過msの1本のみで，クールダウンもフィーバーも同じ値から解決する
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BotPlayerId } from "../roster/BotRosterService";
import { decideBombPlacement } from "./BombPlacementPolicy";

const botPlayerId = "bot:room-1:1" as BotPlayerId;

// SPEC_03「タイムライン」: 経過120秒（残り60秒）でフィーバー開始
const FEVER_START_ELAPSED_MS = 120_000;

/** Math.randomを固定値へ差し替える */
const mockRandom = (value: number): void => {
  vi.spyOn(Math, "random").mockReturnValue(value);
};

describe("decideBombPlacement", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("クールダウン中は設置しないこと", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 3_999, 0, 0, 1, 2);

    expect(result.placeBombPayload).toBeNull();
  });

  it("クールダウン中は連番と最終設置経過msを維持すること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 3_999, 0, 7, 1, 2);

    expect(result).toMatchObject({
      nextBombSeq: 7,
      nextLastBombPlacedAtElapsedMs: 0,
    });
  });

  it("クールダウン経過直後は設置できること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 0, 1, 2);

    expect(result.placeBombPayload).not.toBeNull();
  });

  it("未設置（最終設置経過msが負の無限大）なら経過0でも設置できること", () => {
    mockRandom(0);

    const result = decideBombPlacement(
      botPlayerId,
      0,
      Number.NEGATIVE_INFINITY,
      0,
      1,
      2,
    );

    expect(result.placeBombPayload).not.toBeNull();
  });

  it("確率判定に外れた場合は設置しないこと", () => {
    mockRandom(0.5);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 0, 1, 2);

    expect(result.placeBombPayload).toBeNull();
  });

  it("設置時はBotIDと次の連番からリクエストIDを生成すること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 4, 1, 2);

    expect(result.placeBombPayload?.requestId).toBe("bot-bot:room-1:1-5");
  });

  it("設置時は現在座標をペイロードへ含めること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 0, 1.5, 2.5);

    expect(result.placeBombPayload).toMatchObject({ x: 1.5, y: 2.5 });
  });

  it("設置時は経過時間に導火線時間を加えた爆発時刻を設定すること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 0, 1, 2);

    expect(result.placeBombPayload?.explodeAtElapsedMs).toBe(5_000);
  });

  it("設置時は連番を1つ進めること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 4, 1, 2);

    expect(result.nextBombSeq).toBe(5);
  });

  it("設置時は最終設置経過msを現在の経過msへ更新すること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 0, 1, 2);

    expect(result.nextLastBombPlacedAtElapsedMs).toBe(4_000);
  });

  it("フィーバー開始前は2000ms経過でも設置しないこと", () => {
    mockRandom(0);

    const result = decideBombPlacement(
      botPlayerId,
      FEVER_START_ELAPSED_MS - 1,
      FEVER_START_ELAPSED_MS - 1 - 2_000,
      0,
      1,
      2,
    );

    expect(result.placeBombPayload).toBeNull();
  });

  it("フィーバー中は2000msの1ms手前では設置しないこと", () => {
    mockRandom(0);

    const result = decideBombPlacement(
      botPlayerId,
      FEVER_START_ELAPSED_MS,
      FEVER_START_ELAPSED_MS - 1_999,
      0,
      1,
      2,
    );

    expect(result.placeBombPayload).toBeNull();
  });

  it("フィーバー中は2000ms経過で設置できること", () => {
    mockRandom(0);

    const result = decideBombPlacement(
      botPlayerId,
      FEVER_START_ELAPSED_MS,
      FEVER_START_ELAPSED_MS - 2_000,
      0,
      1,
      2,
    );

    expect(result.placeBombPayload).not.toBeNull();
  });

  it("フィーバー中も確率判定に外れた場合は設置しないこと", () => {
    mockRandom(0.5);

    const result = decideBombPlacement(
      botPlayerId,
      FEVER_START_ELAPSED_MS,
      FEVER_START_ELAPSED_MS - 2_000,
      0,
      1,
      2,
    );

    expect(result.placeBombPayload).toBeNull();
  });

  it("制限時間経過後もフィーバーのクールダウンを適用すること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 300_000, 298_000, 0, 1, 2);

    expect(result.placeBombPayload).not.toBeNull();
  });
});
