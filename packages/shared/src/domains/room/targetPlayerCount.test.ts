/**
 * targetPlayerCount.test
 * 目標人数の判定・選択肢生成ロジックの仕様適合を検証するテスト
 * SPEC_02（4人刻み・下限4・最大100・4の倍数のみ受け入れ）を基準に，
 * 妥当性判定の境界値と非数値入力，下限切り上げ・上限切り下げ，選択肢生成を検証する
 */
import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "../../config/gameConfig";
import {
  createTargetPlayerCountOptions,
  isTargetPlayerCountUnit,
  isValidTargetPlayerCount,
  MIN_TARGET_PLAYER_COUNT,
  resolveMaxTargetPlayerCount,
  resolveMinTargetPlayerCount,
  TARGET_PLAYER_COUNT_UNIT,
} from "./targetPlayerCount";

// 仕様上のルーム最大人数（SPEC_02: 目標人数の最大は100人）
const MAX_PLAYERS = 100;

describe("TARGET_PLAYER_COUNT_UNIT", () => {
  it("刻み幅がチーム数と同じ4であること", () => {
    expect(TARGET_PLAYER_COUNT_UNIT).toBe(4);
  });

  it("刻み幅がチーム数設定に追従すること", () => {
    expect(TARGET_PLAYER_COUNT_UNIT).toBe(GAME_CONFIG.TEAM_COUNT);
  });
});

describe("MIN_TARGET_PLAYER_COUNT", () => {
  it("下限が全チームに1人ずつ配置できる4であること", () => {
    expect(MIN_TARGET_PLAYER_COUNT).toBe(4);
  });
});

describe("isTargetPlayerCountUnit", () => {
  it("4を刻み幅の値と判定すること", () => {
    expect(isTargetPlayerCountUnit(4)).toBe(true);
  });

  it("8を刻み幅の値と判定すること", () => {
    expect(isTargetPlayerCountUnit(8)).toBe(true);
  });

  it("100を刻み幅の値と判定すること", () => {
    expect(isTargetPlayerCountUnit(100)).toBe(true);
  });

  it("上限を超える104も刻み幅の値と判定すること", () => {
    expect(isTargetPlayerCountUnit(104)).toBe(true);
  });

  it("0を刻み幅の値と判定しないこと", () => {
    expect(isTargetPlayerCountUnit(0)).toBe(false);
  });

  it("4の倍数でない3を刻み幅の値と判定しないこと", () => {
    expect(isTargetPlayerCountUnit(3)).toBe(false);
  });

  it("4の倍数でない6を刻み幅の値と判定しないこと", () => {
    expect(isTargetPlayerCountUnit(6)).toBe(false);
  });

  it("負の4の倍数を刻み幅の値と判定しないこと", () => {
    expect(isTargetPlayerCountUnit(-4)).toBe(false);
  });

  it("小数を刻み幅の値と判定しないこと", () => {
    expect(isTargetPlayerCountUnit(8.5)).toBe(false);
  });

  it("NaNを刻み幅の値と判定しないこと", () => {
    expect(isTargetPlayerCountUnit(Number.NaN)).toBe(false);
  });

  it("Infinityを刻み幅の値と判定しないこと", () => {
    expect(isTargetPlayerCountUnit(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("isValidTargetPlayerCount", () => {
  it("下限の4を受け入れること", () => {
    expect(isValidTargetPlayerCount(4, MAX_PLAYERS)).toBe(true);
  });

  it("刻み幅どおりの8を受け入れること", () => {
    expect(isValidTargetPlayerCount(8, MAX_PLAYERS)).toBe(true);
  });

  it("上限と同じ100を受け入れること", () => {
    expect(isValidTargetPlayerCount(100, MAX_PLAYERS)).toBe(true);
  });

  it("下限未満の3を受け入れないこと", () => {
    expect(isValidTargetPlayerCount(3, MAX_PLAYERS)).toBe(false);
  });

  it("0を受け入れないこと", () => {
    expect(isValidTargetPlayerCount(0, MAX_PLAYERS)).toBe(false);
  });

  it("負の値を受け入れないこと", () => {
    expect(isValidTargetPlayerCount(-4, MAX_PLAYERS)).toBe(false);
  });

  it("4の倍数でない5を受け入れないこと", () => {
    expect(isValidTargetPlayerCount(5, MAX_PLAYERS)).toBe(false);
  });

  it("4の倍数でない6を受け入れないこと", () => {
    expect(isValidTargetPlayerCount(6, MAX_PLAYERS)).toBe(false);
  });

  it("4の倍数でない10を受け入れないこと", () => {
    expect(isValidTargetPlayerCount(10, MAX_PLAYERS)).toBe(false);
  });

  it("小数の8.5を受け入れないこと", () => {
    expect(isValidTargetPlayerCount(8.5, MAX_PLAYERS)).toBe(false);
  });

  it("NaNを受け入れないこと", () => {
    expect(isValidTargetPlayerCount(Number.NaN, MAX_PLAYERS)).toBe(false);
  });

  it("Infinityを受け入れないこと", () => {
    expect(isValidTargetPlayerCount(Number.POSITIVE_INFINITY, MAX_PLAYERS))
      .toBe(false);
  });

  it("-Infinityを受け入れないこと", () => {
    expect(isValidTargetPlayerCount(Number.NEGATIVE_INFINITY, MAX_PLAYERS))
      .toBe(false);
  });

  it("上限を超える104を受け入れないこと", () => {
    expect(isValidTargetPlayerCount(104, MAX_PLAYERS)).toBe(false);
  });

  it("ルーム上限が4の倍数でない場合は上限以下の4の倍数を受け入れること", () => {
    expect(isValidTargetPlayerCount(8, 10)).toBe(true);
  });

  it("ルーム上限が4の倍数でない場合でも上限自体は4の倍数でなければ受け入れないこと", () => {
    expect(isValidTargetPlayerCount(10, 10)).toBe(false);
  });

  it("ルーム上限が4の倍数でない場合に上限を超える4の倍数を受け入れないこと", () => {
    expect(isValidTargetPlayerCount(12, 10)).toBe(false);
  });
});

describe("resolveMinTargetPlayerCount", () => {
  it("参加人数0でも下限4を返すこと", () => {
    expect(resolveMinTargetPlayerCount(0)).toBe(4);
  });

  it("参加人数1で下限4を返すこと", () => {
    expect(resolveMinTargetPlayerCount(1)).toBe(4);
  });

  it("参加人数4で4を返すこと", () => {
    expect(resolveMinTargetPlayerCount(4)).toBe(4);
  });

  it("参加人数5を4の倍数へ切り上げて8を返すこと", () => {
    expect(resolveMinTargetPlayerCount(5)).toBe(8);
  });

  it("参加人数8で8を返すこと", () => {
    expect(resolveMinTargetPlayerCount(8)).toBe(8);
  });

  it("参加人数9を4の倍数へ切り上げて12を返すこと", () => {
    expect(resolveMinTargetPlayerCount(9)).toBe(12);
  });

  it("参加人数100で100を返すこと", () => {
    expect(resolveMinTargetPlayerCount(100)).toBe(100);
  });

  it("負の参加人数でも下限4を返すこと", () => {
    expect(resolveMinTargetPlayerCount(-4)).toBe(4);
  });

  it("常に4の倍数を返すこと", () => {
    const results = [0, 1, 2, 3, 5, 7, 11, 37, 99].map(
      resolveMinTargetPlayerCount,
    );

    expect(results.every((count) => isTargetPlayerCountUnit(count))).toBe(true);
  });
});

describe("resolveMaxTargetPlayerCount", () => {
  it("ルーム上限100でそのまま100を返すこと", () => {
    expect(resolveMaxTargetPlayerCount(0, MAX_PLAYERS)).toBe(100);
  });

  it("ルーム上限が4の倍数でない10を4の倍数へ切り下げて8を返すこと", () => {
    expect(resolveMaxTargetPlayerCount(0, 10)).toBe(8);
  });

  it("ルーム上限4で4を返すこと", () => {
    expect(resolveMaxTargetPlayerCount(0, 4)).toBe(4);
  });

  it("ルーム上限が下限未満でも下限4を返すこと", () => {
    expect(resolveMaxTargetPlayerCount(0, 3)).toBe(4);
  });

  it("参加人数が上限近くでも上限100を返すこと", () => {
    expect(resolveMaxTargetPlayerCount(97, MAX_PLAYERS)).toBe(100);
  });

  // ルーム上限が4の倍数でなく参加人数が切り下げ値を超える異常時は下限を優先する
  // ※ 返り値がルーム上限(10)を超えるため，サーバ検証では拒否される値になる
  it("切り下げた上限より下限が大きい場合は下限を返すこと", () => {
    expect(resolveMaxTargetPlayerCount(10, 10)).toBe(12);
  });

  it("下限を下回らないこと", () => {
    expect(
      resolveMaxTargetPlayerCount(9, 8) >= resolveMinTargetPlayerCount(9),
    ).toBe(true);
  });

  it("常に4の倍数を返すこと", () => {
    const results = [3, 4, 10, 17, 100].map((maxPlayers) =>
      resolveMaxTargetPlayerCount(0, maxPlayers),
    );

    expect(results.every((count) => isTargetPlayerCountUnit(count))).toBe(true);
  });
});

describe("createTargetPlayerCountOptions", () => {
  it("参加人数0・上限100で4から100までの4刻みの選択肢を返すこと", () => {
    expect(createTargetPlayerCountOptions(0, MAX_PLAYERS)).toEqual([
      4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76,
      80, 84, 88, 92, 96, 100,
    ]);
  });

  it("先頭が下限と一致すること", () => {
    const options = createTargetPlayerCountOptions(5, MAX_PLAYERS);

    expect(options[0]).toBe(resolveMinTargetPlayerCount(5));
  });

  it("末尾が上限と一致すること", () => {
    const options = createTargetPlayerCountOptions(5, MAX_PLAYERS);

    expect(options[options.length - 1]).toBe(
      resolveMaxTargetPlayerCount(5, MAX_PLAYERS),
    );
  });

  it("選択肢が4刻みで並ぶこと", () => {
    const options = createTargetPlayerCountOptions(0, MAX_PLAYERS);
    const diffs = options.slice(1).map((count, index) => {
      return count - options[index];
    });

    expect(diffs.every((diff) => diff === TARGET_PLAYER_COUNT_UNIT)).toBe(true);
  });

  it("参加人数を4の倍数へ切り上げた値から選択肢を開始すること", () => {
    expect(createTargetPlayerCountOptions(9, 20)).toEqual([12, 16, 20]);
  });

  it("ルーム上限が4の倍数でない場合は切り下げた値までを返すこと", () => {
    expect(createTargetPlayerCountOptions(0, 10)).toEqual([4, 8]);
  });

  it("下限と上限が同じ場合は1件だけ返すこと", () => {
    expect(createTargetPlayerCountOptions(0, 4)).toEqual([4]);
  });

  it("すべての選択肢がサーバの受け入れ条件を満たすこと", () => {
    const options = createTargetPlayerCountOptions(37, MAX_PLAYERS);

    expect(
      options.every((count) => isValidTargetPlayerCount(count, MAX_PLAYERS)),
    ).toBe(true);
  });

  it("選択肢が空にならないこと", () => {
    expect(createTargetPlayerCountOptions(0, 0).length).toBeGreaterThan(0);
  });
});
