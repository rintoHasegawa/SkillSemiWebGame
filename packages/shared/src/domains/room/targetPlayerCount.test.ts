/**
 * targetPlayerCount.test
 * 目標人数の判定・選択肢生成ロジックの仕様適合を検証するテスト
 * SPEC_02（4人刻み・下限4・最大100・4の倍数のみ受け入れ）を基準に，
 * 妥当性判定の境界値と非数値入力，下限切り上げ・上限切り下げ，選択肢生成を検証する
 * 入力と期待値だけが異なる判定系の検証はケース表による it.each で表現する
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

/** 刻み幅判定1件分の検証ケース（説明・入力・期待値） */
type UnitCase = [description: string, value: number, expected: boolean];

/** 目標人数の妥当性判定1件分の検証ケース（説明・目標人数・ルーム上限・期待値） */
type ValidCountCase = [
  description: string,
  targetPlayerCount: number,
  maxPlayers: number,
  expected: boolean,
];

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
  const cases: UnitCase[] = [
    ["4を刻み幅の値と判定すること", 4, true],
    ["8を刻み幅の値と判定すること", 8, true],
    ["100を刻み幅の値と判定すること", 100, true],
    ["上限を超える104も刻み幅の値と判定すること", 104, true],
    ["0を刻み幅の値と判定しないこと", 0, false],
    ["4の倍数でない3を刻み幅の値と判定しないこと", 3, false],
    ["4の倍数でない6を刻み幅の値と判定しないこと", 6, false],
    ["負の4の倍数を刻み幅の値と判定しないこと", -4, false],
    ["小数を刻み幅の値と判定しないこと", 8.5, false],
    ["NaNを刻み幅の値と判定しないこと", Number.NaN, false],
    ["Infinityを刻み幅の値と判定しないこと", Number.POSITIVE_INFINITY, false],
  ];

  it.each(cases)("%s", (_description, value, expected) => {
    expect(isTargetPlayerCountUnit(value)).toBe(expected);
  });
});

describe("isValidTargetPlayerCount", () => {
  const cases: ValidCountCase[] = [
    ["下限の4を受け入れること", 4, MAX_PLAYERS, true],
    ["刻み幅どおりの8を受け入れること", 8, MAX_PLAYERS, true],
    ["上限と同じ100を受け入れること", 100, MAX_PLAYERS, true],
    ["下限未満の3を受け入れないこと", 3, MAX_PLAYERS, false],
    ["0を受け入れないこと", 0, MAX_PLAYERS, false],
    ["負の値を受け入れないこと", -4, MAX_PLAYERS, false],
    ["4の倍数でない5を受け入れないこと", 5, MAX_PLAYERS, false],
    ["4の倍数でない6を受け入れないこと", 6, MAX_PLAYERS, false],
    ["4の倍数でない10を受け入れないこと", 10, MAX_PLAYERS, false],
    ["小数の8.5を受け入れないこと", 8.5, MAX_PLAYERS, false],
    ["NaNを受け入れないこと", Number.NaN, MAX_PLAYERS, false],
    ["Infinityを受け入れないこと", Number.POSITIVE_INFINITY, MAX_PLAYERS, false],
    [
      "-Infinityを受け入れないこと",
      Number.NEGATIVE_INFINITY,
      MAX_PLAYERS,
      false,
    ],
    ["上限を超える104を受け入れないこと", 104, MAX_PLAYERS, false],
    [
      "ルーム上限が4の倍数でない場合は上限以下の4の倍数を受け入れること",
      8,
      10,
      true,
    ],
    [
      "ルーム上限が4の倍数でない場合でも上限自体は4の倍数でなければ受け入れないこと",
      10,
      10,
      false,
    ],
    [
      "ルーム上限が4の倍数でない場合に上限を超える4の倍数を受け入れないこと",
      12,
      10,
      false,
    ],
  ];

  it.each(cases)(
    "%s",
    (_description, targetPlayerCount, maxPlayers, expected) => {
      expect(isValidTargetPlayerCount(targetPlayerCount, maxPlayers)).toBe(
        expected,
      );
    },
  );
});

describe("resolveMinTargetPlayerCount", () => {
  const cases: [string, number, number][] = [
    ["参加人数0でも下限4を返すこと", 0, 4],
    ["参加人数1で下限4を返すこと", 1, 4],
    ["参加人数4で4を返すこと", 4, 4],
    ["参加人数5を4の倍数へ切り上げて8を返すこと", 5, 8],
    ["参加人数8で8を返すこと", 8, 8],
    ["参加人数9を4の倍数へ切り上げて12を返すこと", 9, 12],
    ["参加人数100で100を返すこと", 100, 100],
    ["負の参加人数でも下限4を返すこと", -4, 4],
  ];

  it.each(cases)("%s", (_description, playerCount, expected) => {
    expect(resolveMinTargetPlayerCount(playerCount)).toBe(expected);
  });

  it("常に4の倍数を返すこと", () => {
    const results = [0, 1, 2, 3, 5, 7, 11, 37, 99].map(
      resolveMinTargetPlayerCount,
    );

    expect(results.every((count) => isTargetPlayerCountUnit(count))).toBe(true);
  });
});

describe("resolveMaxTargetPlayerCount", () => {
  const cases: [string, number, number, number][] = [
    ["ルーム上限100でそのまま100を返すこと", 0, MAX_PLAYERS, 100],
    ["ルーム上限が4の倍数でない10を4の倍数へ切り下げて8を返すこと", 0, 10, 8],
    ["ルーム上限4で4を返すこと", 0, 4, 4],
    ["ルーム上限が下限未満でも下限4を返すこと", 0, 3, 4],
    ["参加人数が上限近くでも上限100を返すこと", 97, MAX_PLAYERS, 100],
    // ルーム上限が4の倍数でなく参加人数が切り下げ値を超える異常時は下限を優先する
    // ※ 返り値がルーム上限(10)を超えるため，サーバ検証では拒否される値になる
    ["切り下げた上限より下限が大きい場合は下限を返すこと", 10, 10, 12],
  ];

  it.each(cases)("%s", (_description, playerCount, maxPlayers, expected) => {
    expect(resolveMaxTargetPlayerCount(playerCount, maxPlayers)).toBe(expected);
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
  const cases: [string, number, number, number[]][] = [
    [
      "参加人数0・上限100で4から100までの4刻みの選択肢を返すこと",
      0,
      MAX_PLAYERS,
      [
        4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72,
        76, 80, 84, 88, 92, 96, 100,
      ],
    ],
    [
      "参加人数を4の倍数へ切り上げた値から選択肢を開始すること",
      9,
      20,
      [12, 16, 20],
    ],
    [
      "ルーム上限が4の倍数でない場合は切り下げた値までを返すこと",
      0,
      10,
      [4, 8],
    ],
    ["下限と上限が同じ場合は1件だけ返すこと", 0, 4, [4]],
  ];

  it.each(cases)("%s", (_description, playerCount, maxPlayers, expected) => {
    expect(createTargetPlayerCountOptions(playerCount, maxPlayers)).toEqual(
      expected,
    );
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
