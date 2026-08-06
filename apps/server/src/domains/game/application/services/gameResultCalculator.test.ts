/**
 * gameResultCalculator.test
 * ゲーム結果ペイロード生成の純関数のユニットテスト
 */
import { describe, expect, it } from "vitest";

import { buildGameResultPayload } from "./gameResultCalculator";

describe("buildGameResultPayload", () => {
  it("塗り数が最多のチームを1位にすること", () => {
    const result = buildGameResultPayload([0, 0, 0, 1]);

    expect(result.rankings[0]).toMatchObject({ rank: 1, teamId: 0 });
  });

  it("チーム数ぶんの順位を返すこと", () => {
    const result = buildGameResultPayload([0, 1, 2, 3]);

    expect(result.rankings).toHaveLength(4);
  });
});
