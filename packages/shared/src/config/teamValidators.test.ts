/**
 * teamValidators.test
 * チーム設定検証関数の現行挙動を固定する characterization test
 * teamId の境界値・非整数入力・設定整合性の throw 分岐を検証する
 */
import { describe, expect, it } from "vitest";

import { GAME_CONFIG, TEAM_NAMES, UNKNOWN_TEAM_ID } from "./gameConfig";
import {
  assertValidTeamId,
  isKnownTeamId,
  isUnknownTeamId,
  validateTeamConfig,
} from "./teamValidators";

describe("isUnknownTeamId", () => {
  it("UNKNOWN_TEAM_ID と一致する値を unknown と判定すること", () => {
    expect(isUnknownTeamId(UNKNOWN_TEAM_ID)).toBe(true);
  });

  it("有効な teamId の先頭値を unknown と判定しないこと", () => {
    expect(isUnknownTeamId(0)).toBe(false);
  });

  it("UNKNOWN_TEAM_ID 以外の負値を unknown と判定しないこと", () => {
    expect(isUnknownTeamId(UNKNOWN_TEAM_ID - 1)).toBe(false);
  });

  it("NaN を unknown と判定しないこと", () => {
    expect(isUnknownTeamId(Number.NaN)).toBe(false);
  });
});

describe("isKnownTeamId", () => {
  it("下限の teamId 0 を有効と判定すること", () => {
    expect(isKnownTeamId(0)).toBe(true);
  });

  it("上限の teamId (TEAM_COUNT - 1) を有効と判定すること", () => {
    expect(isKnownTeamId(GAME_CONFIG.TEAM_COUNT - 1)).toBe(true);
  });

  it("TEAM_COUNT と同値の teamId を無効と判定すること", () => {
    expect(isKnownTeamId(GAME_CONFIG.TEAM_COUNT)).toBe(false);
  });

  it("負の teamId を無効と判定すること", () => {
    expect(isKnownTeamId(-1)).toBe(false);
  });

  it("UNKNOWN_TEAM_ID を無効と判定すること", () => {
    expect(isKnownTeamId(UNKNOWN_TEAM_ID)).toBe(false);
  });

  it("小数の teamId を無効と判定すること", () => {
    expect(isKnownTeamId(1.5)).toBe(false);
  });

  it("NaN を無効と判定すること", () => {
    expect(isKnownTeamId(Number.NaN)).toBe(false);
  });

  it("Infinity を無効と判定すること", () => {
    expect(isKnownTeamId(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("有効範囲内の全 teamId を有効と判定すること", () => {
    const teamIds = Array.from(
      { length: GAME_CONFIG.TEAM_COUNT },
      (_, index) => index,
    );

    expect(teamIds.every((teamId) => isKnownTeamId(teamId))).toBe(true);
  });
});

describe("validateTeamConfig", () => {
  it("現行設定では例外を投げないこと", () => {
    expect(() => validateTeamConfig()).not.toThrow();
  });

  it("TEAM_NAMES の要素数が TEAM_COUNT と一致していること", () => {
    expect(TEAM_NAMES.length).toBe(GAME_CONFIG.TEAM_COUNT);
  });
});

describe("assertValidTeamId", () => {
  it("下限の teamId 0 で例外を投げないこと", () => {
    expect(() => assertValidTeamId(0)).not.toThrow();
  });

  it("上限の teamId (TEAM_COUNT - 1) で例外を投げないこと", () => {
    expect(() => assertValidTeamId(GAME_CONFIG.TEAM_COUNT - 1)).not.toThrow();
  });

  it("TEAM_COUNT と同値の teamId で例外を投げること", () => {
    expect(() => assertValidTeamId(GAME_CONFIG.TEAM_COUNT)).toThrow(
      `Invalid teamId: ${GAME_CONFIG.TEAM_COUNT}`,
    );
  });

  it("負の teamId で例外を投げること", () => {
    expect(() => assertValidTeamId(-1)).toThrow("Invalid teamId: -1");
  });

  it("UNKNOWN_TEAM_ID で例外を投げること", () => {
    expect(() => assertValidTeamId(UNKNOWN_TEAM_ID)).toThrow(
      `Invalid teamId: ${UNKNOWN_TEAM_ID}`,
    );
  });

  it("小数の teamId で例外を投げること", () => {
    expect(() => assertValidTeamId(0.5)).toThrow("Invalid teamId: 0.5");
  });

  it("NaN で例外を投げること", () => {
    expect(() => assertValidTeamId(Number.NaN)).toThrow("Invalid teamId: NaN");
  });
});
