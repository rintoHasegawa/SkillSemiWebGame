/**
 * socketPayloadValidators.test
 * 受信ペイロード型ガード群の仕様適合を検証するテスト
 * 正常系と非オブジェクト・配列・型不一致・境界値の失敗分岐を検証する
 * 各ガードの検証は [説明, 入力, 期待値] のケース表による it.each で表現する
 * チームIDの有効範囲は SPEC_03（チームID 0〜3）を基準とする
 * JOIN_ROOM の入力条件は SPEC_02「入力の受け入れ条件」（trim 後に非空・
 * UTF-16 で 32 コードユニット以内・制御文字や不可視の書式文字を禁止）を基準とする
 */
import { domain } from "@repo/shared";
import { describe, expect, it } from "vitest";

import {
  isBombHitReportPayload,
  isJoinRoomPayload,
  isLobbySettingsUpdatePayload,
  isMovePayload,
  isPingPayload,
  isPlaceBombPayload,
  isSelectTeamPayload,
  isStartGamePayload,
} from "./socketPayloadValidators";

// プロトコル内部IDの防御的な最大長（サーバ採番・クライアント採番とも十進連番で数文字）
const MAX_BOMB_ID_LENGTH = 64;

/** 型ガード1件分の検証ケース（説明・入力・期待値） */
type ValidatorCase = [description: string, input: unknown, expected: boolean];

describe("isPingPayload", () => {
  const cases: ValidatorCase[] = [
    ["有限数の場合はtrueを返すこと", 1700000000000, true],
    ["0の場合はtrueを返すこと", 0, true],
    ["負値の場合もtrueを返すこと", -1, true],
    ["小数の場合もtrueを返すこと", 1.5, true],
    ["NaNの場合はfalseを返すこと", Number.NaN, false],
    ["Infinityの場合はfalseを返すこと", Number.POSITIVE_INFINITY, false],
    ["数値文字列の場合はfalseを返すこと", "100", false],
    ["nullの場合はfalseを返すこと", null, false],
    ["undefinedの場合はfalseを返すこと", undefined, false],
    ["オブジェクトの場合はfalseを返すこと", { value: 1 }, false],
  ];

  it.each(cases)("%s", (_description, input, expected) => {
    expect(isPingPayload(input)).toBe(expected);
  });
});

describe("isMovePayload", () => {
  const cases: ValidatorCase[] = [
    ["xとyが有限数の場合はtrueを返すこと", { x: 1.25, y: -2.5 }, true],
    ["xとyが0の場合はtrueを返すこと", { x: 0, y: 0 }, true],
    ["未知のフィールドを含んでもtrueを返すこと", { x: 1, y: 2, z: 3 }, true],
    ["xが欠落している場合はfalseを返すこと", { y: 2 }, false],
    ["yが欠落している場合はfalseを返すこと", { x: 1 }, false],
    ["xが文字列の場合はfalseを返すこと", { x: "1", y: 2 }, false],
    ["yがNaNの場合はfalseを返すこと", { x: 1, y: Number.NaN }, false],
    [
      "xがInfinityの場合はfalseを返すこと",
      { x: Number.POSITIVE_INFINITY, y: 0 },
      false,
    ],
    ["nullの場合はfalseを返すこと", null, false],
    ["undefinedの場合はfalseを返すこと", undefined, false],
    ["数値の場合はfalseを返すこと", 1, false],
    ["空オブジェクトの場合はfalseを返すこと", {}, false],
    ["空配列の場合はfalseを返すこと", [], false],
    [
      "座標を持つ配列の場合はfalseを返すこと",
      Object.assign([], { x: 1, y: 2 }),
      false,
    ],
  ];

  it.each(cases)("%s", (_description, input, expected) => {
    expect(isMovePayload(input)).toBe(expected);
  });
});

describe("isPlaceBombPayload", () => {
  const cases: ValidatorCase[] = [
    [
      "設置要求の全フィールドが揃う場合はtrueを返すこと",
      { requestId: "req-1", x: 1, y: 2, explodeAtElapsedMs: 3000 },
      true,
    ],
    [
      "requestIdが空文字の場合はfalseを返すこと",
      { requestId: "", x: 1, y: 2, explodeAtElapsedMs: 3000 },
      false,
    ],
    [
      "explodeAtElapsedMsが欠落している場合はfalseを返すこと",
      { requestId: "req-1", x: 1, y: 2 },
      false,
    ],
    ["nullの場合はfalseを返すこと", null, false],
    ["undefinedの場合はfalseを返すこと", undefined, false],
  ];

  it.each(cases)("%s", (_description, input, expected) => {
    expect(isPlaceBombPayload(input)).toBe(expected);
  });
});

describe("isBombHitReportPayload", () => {
  const cases: ValidatorCase[] = [
    ["bombIdが非空文字列の場合はtrueを返すこと", { bombId: "bomb-1" }, true],
    [
      "未知のフィールドを含んでもtrueを返すこと",
      { bombId: "bomb-1", extra: 1 },
      true,
    ],
    ["bombIdが空文字の場合はfalseを返すこと", { bombId: "" }, false],
    ["bombIdが空白のみの場合はfalseを返すこと", { bombId: "  " }, false],
    [
      "bombIdが前後に空白を含む場合はtrueを返すこと",
      { bombId: " bomb-1 " },
      true,
    ],
    ["bombIdが数値の場合はfalseを返すこと", { bombId: 1 }, false],
    [
      "bombIdが上限64文字の場合はtrueを返すこと",
      { bombId: "a".repeat(MAX_BOMB_ID_LENGTH) },
      true,
    ],
    [
      "bombIdが上限超過の65文字の場合はfalseを返すこと",
      { bombId: "a".repeat(MAX_BOMB_ID_LENGTH + 1) },
      false,
    ],
    [
      "bombIdが1MB相当の巨大文字列の場合はfalseを返すこと",
      { bombId: "a".repeat(1_000_000) },
      false,
    ],
    ["bombIdが欠落している場合はfalseを返すこと", {}, false],
    ["nullの場合はfalseを返すこと", null, false],
    ["undefinedの場合はfalseを返すこと", undefined, false],
    ["文字列の場合はfalseを返すこと", "bomb-1", false],
    ["空配列の場合はfalseを返すこと", [], false],
    [
      "bombIdを持つ配列の場合もfalseを返すこと",
      Object.assign([], { bombId: "bomb-1" }),
      false,
    ],
  ];

  it.each(cases)("%s", (_description, input, expected) => {
    expect(isBombHitReportPayload(input)).toBe(expected);
  });
});

describe("isStartGamePayload", () => {
  const cases: ValidatorCase[] = [
    ["空オブジェクトの場合はtrueを返すこと", {}, true],
    [
      "targetPlayerCountのみ指定した場合はtrueを返すこと",
      { targetPlayerCount: 4 },
      true,
    ],
    [
      "fieldSizePresetのみ指定した場合はtrueを返すこと",
      { fieldSizePreset: "SMALL" },
      true,
    ],
    [
      "両方指定した場合はtrueを返すこと",
      { targetPlayerCount: 8, fieldSizePreset: "XLARGE" },
      true,
    ],
    [
      "targetPlayerCountが0の場合はfalseを返すこと",
      { targetPlayerCount: 0 },
      false,
    ],
    [
      "targetPlayerCountが1の場合はtrueを返すこと",
      { targetPlayerCount: 1 },
      true,
    ],
    [
      "targetPlayerCountが負値の場合はfalseを返すこと",
      { targetPlayerCount: -1 },
      false,
    ],
    [
      "targetPlayerCountが小数の場合はfalseを返すこと",
      { targetPlayerCount: 2.5 },
      false,
    ],
    [
      "targetPlayerCountが数値文字列の場合はfalseを返すこと",
      { targetPlayerCount: "4" },
      false,
    ],
    [
      "targetPlayerCountがNaNの場合はfalseを返すこと",
      { targetPlayerCount: Number.NaN },
      false,
    ],
    [
      "targetPlayerCountがnullの場合はfalseを返すこと",
      { targetPlayerCount: null },
      false,
    ],
    [
      "targetPlayerCountが上限なく巨大でもtrueを返すこと",
      { targetPlayerCount: 100000 },
      true,
    ],
    [
      "targetPlayerCount未指定でfieldSizePresetが不正な場合はfalseを返すこと",
      { fieldSizePreset: "HUGE" },
      false,
    ],
    [
      "targetPlayerCount未指定でfieldSizePresetがnullの場合はfalseを返すこと",
      { fieldSizePreset: null },
      false,
    ],
    [
      "targetPlayerCount指定でfieldSizePresetが不正な場合はfalseを返すこと",
      { targetPlayerCount: 4, fieldSizePreset: "small" },
      false,
    ],
    [
      "fieldSizePresetがMEDIUMの場合はtrueを返すこと",
      { fieldSizePreset: "MEDIUM" },
      true,
    ],
    [
      "fieldSizePresetがLARGEの場合はtrueを返すこと",
      { fieldSizePreset: "LARGE" },
      true,
    ],
    [
      "targetPlayerCountがundefinedとして明示されてもtrueを返すこと",
      { targetPlayerCount: undefined },
      true,
    ],
    ["nullの場合はfalseを返すこと", null, false],
    ["undefinedの場合はfalseを返すこと", undefined, false],
    ["数値の場合はfalseを返すこと", 4, false],
    ["空配列の場合はfalseを返すこと", [], false],
    [
      "目標人数を持つ配列の場合もfalseを返すこと",
      Object.assign([], { targetPlayerCount: 4 }),
      false,
    ],
  ];

  it.each(cases)("%s", (_description, input, expected) => {
    expect(isStartGamePayload(input)).toBe(expected);
  });
});

describe("isLobbySettingsUpdatePayload", () => {
  /** テスト用のロビー設定ペイロードを生成する */
  const createPayload = (overrides: Record<string, unknown> = {}): unknown => {
    return {
      targetPlayerCount: 4,
      fieldSizePreset: "MEDIUM",
      teamAssignmentMode: "random",
      ...overrides,
    };
  };

  const cases: ValidatorCase[] = [
    ["全フィールドが妥当な場合はtrueを返すこと", createPayload(), true],
    [
      "teamAssignmentModeがplayer_selectの場合はtrueを返すこと",
      createPayload({ teamAssignmentMode: "player_select" }),
      true,
    ],
    [
      "未知のフィールドを含んでもtrueを返すこと",
      createPayload({ extra: true }),
      true,
    ],
    [
      "targetPlayerCountが欠落している場合はfalseを返すこと",
      { fieldSizePreset: "MEDIUM", teamAssignmentMode: "random" },
      false,
    ],
    [
      "targetPlayerCountが0の場合はfalseを返すこと",
      createPayload({ targetPlayerCount: 0 }),
      false,
    ],
    [
      "targetPlayerCountが小数の場合はfalseを返すこと",
      createPayload({ targetPlayerCount: 4.5 }),
      false,
    ],
    [
      "fieldSizePresetが欠落している場合はfalseを返すこと",
      { targetPlayerCount: 4, teamAssignmentMode: "random" },
      false,
    ],
    [
      "fieldSizePresetが不正な値の場合はfalseを返すこと",
      createPayload({ fieldSizePreset: "TINY" }),
      false,
    ],
    [
      "fieldSizePresetがSMALLの場合はtrueを返すこと",
      createPayload({ fieldSizePreset: "SMALL" }),
      true,
    ],
    [
      "fieldSizePresetがXLARGEの場合はtrueを返すこと",
      createPayload({ fieldSizePreset: "XLARGE" }),
      true,
    ],
    [
      "teamAssignmentModeが不正な値の場合はfalseを返すこと",
      createPayload({ teamAssignmentMode: "auto" }),
      false,
    ],
    [
      "teamAssignmentModeが欠落している場合はfalseを返すこと",
      { targetPlayerCount: 4, fieldSizePreset: "MEDIUM" },
      false,
    ],
    ["nullの場合はfalseを返すこと", null, false],
    ["undefinedの場合はfalseを返すこと", undefined, false],
    ["空オブジェクトの場合はfalseを返すこと", {}, false],
    ["文字列の場合はfalseを返すこと", "settings", false],
    ["空配列の場合はfalseを返すこと", [], false],
    [
      "全フィールドを持つ配列の場合もfalseを返すこと",
      Object.assign([], {
        targetPlayerCount: 4,
        fieldSizePreset: "MEDIUM",
        teamAssignmentMode: "random",
      }),
      false,
    ],
  ];

  it.each(cases)("%s", (_description, input, expected) => {
    expect(isLobbySettingsUpdatePayload(input)).toBe(expected);
  });
});

describe("isSelectTeamPayload", () => {
  it.each([0, 1, 2, 3])(
    "preferredTeamIdが有効チームID %i の場合はtrueを返すこと",
    (teamId) => {
      expect(isSelectTeamPayload({ preferredTeamId: teamId })).toBe(true);
    },
  );

  const cases: ValidatorCase[] = [
    [
      "preferredTeamIdがnullの場合はtrueを返すこと",
      { preferredTeamId: null },
      true,
    ],
    [
      "preferredTeamIdがチーム数と同じ4の場合はfalseを返すこと",
      { preferredTeamId: 4 },
      false,
    ],
    [
      "preferredTeamIdがチーム数を超える整数の場合はfalseを返すこと",
      { preferredTeamId: 999 },
      false,
    ],
    [
      "preferredTeamIdが負値の場合はfalseを返すこと",
      { preferredTeamId: -1 },
      false,
    ],
    [
      "preferredTeamIdがInfinityの場合はfalseを返すこと",
      { preferredTeamId: Number.POSITIVE_INFINITY },
      false,
    ],
    [
      "preferredTeamIdが小数の場合はfalseを返すこと",
      { preferredTeamId: 1.5 },
      false,
    ],
    [
      "preferredTeamIdが数値文字列の場合はfalseを返すこと",
      { preferredTeamId: "1" },
      false,
    ],
    [
      "preferredTeamIdがNaNの場合はfalseを返すこと",
      { preferredTeamId: Number.NaN },
      false,
    ],
    ["preferredTeamIdが欠落している場合はfalseを返すこと", {}, false],
    ["nullの場合はfalseを返すこと", null, false],
    ["undefinedの場合はfalseを返すこと", undefined, false],
    ["数値の場合はfalseを返すこと", 1, false],
    ["空配列の場合はfalseを返すこと", [], false],
    [
      "希望チームIDを持つ配列の場合もfalseを返すこと",
      Object.assign([], { preferredTeamId: 1 }),
      false,
    ],
  ];

  it.each(cases)("%s", (_description, input, expected) => {
    expect(isSelectTeamPayload(input)).toBe(expected);
  });
});

describe("isJoinRoomPayload", () => {
  const cases: ValidatorCase[] = [
    [
      "roomIdとplayerNameが非空文字列の場合はtrueを返すこと",
      { roomId: "room-1", playerName: "taro" },
      true,
    ],
    [
      "未知のフィールドを含んでもtrueを返すこと",
      { roomId: "room-1", playerName: "taro", extra: 1 },
      true,
    ],
    [
      "roomIdが空文字の場合はfalseを返すこと",
      { roomId: "", playerName: "taro" },
      false,
    ],
    [
      "roomIdが空白のみの場合はfalseを返すこと",
      { roomId: "   ", playerName: "taro" },
      false,
    ],
    [
      "playerNameが空文字の場合はfalseを返すこと",
      { roomId: "room-1", playerName: "" },
      false,
    ],
    [
      "playerNameが空白のみの場合はfalseを返すこと",
      { roomId: "room-1", playerName: "\n\t" },
      false,
    ],
    [
      "playerNameが前後に空白を含む場合はtrueを返すこと",
      { roomId: "room-1", playerName: " taro " },
      true,
    ],
    [
      "playerNameが数値の場合はfalseを返すこと",
      { roomId: "room-1", playerName: 1 },
      false,
    ],
    [
      "roomIdが欠落している場合はfalseを返すこと",
      { playerName: "taro" },
      false,
    ],
    ["空オブジェクトの場合はfalseを返すこと", {}, false],
    ["nullの場合はfalseを返すこと", null, false],
    ["undefinedの場合はfalseを返すこと", undefined, false],
    ["文字列の場合はfalseを返すこと", "room-1", false],
    ["空配列の場合はfalseを返すこと", [], false],
    [
      "必須フィールドを持つ配列の場合もfalseを返すこと",
      Object.assign([], { roomId: "room-1", playerName: "taro" }),
      false,
    ],
    [
      "roomIdが最大長ちょうどの場合はtrueを返すこと",
      {
        roomId: "a".repeat(domain.room.ROOM_ID_MAX_LENGTH),
        playerName: "taro",
      },
      true,
    ],
    [
      "roomIdが最大長を1文字超える場合はfalseを返すこと",
      {
        roomId: "a".repeat(domain.room.ROOM_ID_MAX_LENGTH + 1),
        playerName: "taro",
      },
      false,
    ],
    [
      "playerNameが最大長ちょうどの場合はtrueを返すこと",
      {
        roomId: "room-1",
        playerName: "a".repeat(domain.room.PLAYER_NAME_MAX_LENGTH),
      },
      true,
    ],
    [
      "playerNameが最大長を1文字超える場合はfalseを返すこと",
      {
        roomId: "room-1",
        playerName: "a".repeat(domain.room.PLAYER_NAME_MAX_LENGTH + 1),
      },
      false,
    ],
    [
      "roomIdとplayerNameが日本語の場合はtrueを返すこと",
      { roomId: "部屋１", playerName: "たろう" },
      true,
    ],
    [
      "roomIdが改行を含む場合はfalseを返すこと",
      { roomId: "room\n1", playerName: "taro" },
      false,
    ],
    [
      "playerNameが改行を含む場合はfalseを返すこと",
      { roomId: "room-1", playerName: "ta\nro" },
      false,
    ],
    [
      "roomIdが前後に空白を含む場合はtrueを返すこと",
      { roomId: " room-1 ", playerName: "taro" },
      true,
    ],
    [
      "roomIdが数値の場合はfalseを返すこと",
      { roomId: 1, playerName: "taro" },
      false,
    ],
    [
      "roomIdがnullの場合はfalseを返すこと",
      { roomId: null, playerName: "taro" },
      false,
    ],
    [
      "roomIdが配列の場合はfalseを返すこと",
      { roomId: ["room-1"], playerName: "taro" },
      false,
    ],
    [
      "playerNameがnullの場合はfalseを返すこと",
      { roomId: "room-1", playerName: null },
      false,
    ],
    [
      "playerNameが配列の場合はfalseを返すこと",
      { roomId: "room-1", playerName: ["taro"] },
      false,
    ],
  ];

  it.each(cases)("%s", (_description, input, expected) => {
    expect(isJoinRoomPayload(input)).toBe(expected);
  });
});
