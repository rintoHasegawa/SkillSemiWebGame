/**
 * BombPlacementPolicy.test
 * Bot爆弾設置判定の現行挙動を固定する characterization test
 * クールダウン境界と確率判定の分岐を検証する
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BotPlayerId } from "../roster/BotRosterService";
import { decideBombPlacement } from "./BombPlacementPolicy";

const botPlayerId = "bot:room-1:1" as BotPlayerId;

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

    const result = decideBombPlacement(botPlayerId, 3_999, 0, 0, 0, 1, 2);

    expect(result.placeBombPayload).toBeNull();
  });

  it("クールダウン中は連番と最終設置時刻を維持すること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 3_999, 0, 0, 7, 1, 2);

    expect(result).toMatchObject({
      nextBombSeq: 7,
      nextLastBombPlacedAtMs: 0,
    });
  });

  it("クールダウン経過直後は設置できること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 0, 0, 1, 2);

    expect(result.placeBombPayload).not.toBeNull();
  });

  it("確率判定に外れた場合は設置しないこと", () => {
    mockRandom(0.5);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 0, 0, 1, 2);

    expect(result.placeBombPayload).toBeNull();
  });

  it("設置時はBotIDと次の連番からリクエストIDを生成すること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 0, 4, 1, 2);

    expect(result.placeBombPayload?.requestId).toBe("bot-bot:room-1:1-5");
  });

  it("設置時は現在座標をペイロードへ含めること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 0, 0, 1.5, 2.5);

    expect(result.placeBombPayload).toMatchObject({ x: 1.5, y: 2.5 });
  });

  it("設置時は経過時間に導火線時間を加えた爆発時刻を設定すること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 4_000, 2_000, 0, 0, 1, 2);

    expect(result.placeBombPayload?.explodeAtElapsedMs).toBe(3_000);
  });

  it("設置時は連番を1つ進めること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 0, 4, 1, 2);

    expect(result.nextBombSeq).toBe(5);
  });

  it("設置時は最終設置時刻を現在時刻へ更新すること", () => {
    mockRandom(0);

    const result = decideBombPlacement(botPlayerId, 4_000, 0, 0, 0, 1, 2);

    expect(result.nextLastBombPlacedAtMs).toBe(4_000);
  });
});
