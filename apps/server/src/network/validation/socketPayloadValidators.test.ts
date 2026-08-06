/**
 * socketPayloadValidators.test
 * 受信ペイロード型ガード群の現行挙動を固定する characterization test
 * 正常系と非オブジェクト・型不一致・境界値の失敗分岐を検証する
 */
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

describe("isPingPayload", () => {
  it("有限数の場合はtrueを返すこと", () => {
    expect(isPingPayload(1700000000000)).toBe(true);
  });

  it("0の場合はtrueを返すこと", () => {
    expect(isPingPayload(0)).toBe(true);
  });

  it("負値の場合もtrueを返すこと", () => {
    expect(isPingPayload(-1)).toBe(true);
  });

  it("小数の場合もtrueを返すこと", () => {
    expect(isPingPayload(1.5)).toBe(true);
  });

  it("NaNの場合はfalseを返すこと", () => {
    expect(isPingPayload(Number.NaN)).toBe(false);
  });

  it("Infinityの場合はfalseを返すこと", () => {
    expect(isPingPayload(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("数値文字列の場合はfalseを返すこと", () => {
    expect(isPingPayload("100")).toBe(false);
  });

  it("nullの場合はfalseを返すこと", () => {
    expect(isPingPayload(null)).toBe(false);
  });

  it("undefinedの場合はfalseを返すこと", () => {
    expect(isPingPayload(undefined)).toBe(false);
  });

  it("オブジェクトの場合はfalseを返すこと", () => {
    expect(isPingPayload({ value: 1 })).toBe(false);
  });
});

describe("isMovePayload", () => {
  it("xとyが有限数の場合はtrueを返すこと", () => {
    expect(isMovePayload({ x: 1.25, y: -2.5 })).toBe(true);
  });

  it("xとyが0の場合はtrueを返すこと", () => {
    expect(isMovePayload({ x: 0, y: 0 })).toBe(true);
  });

  it("未知のフィールドを含んでもtrueを返すこと", () => {
    expect(isMovePayload({ x: 1, y: 2, z: 3 })).toBe(true);
  });

  it("xが欠落している場合はfalseを返すこと", () => {
    expect(isMovePayload({ y: 2 })).toBe(false);
  });

  it("yが欠落している場合はfalseを返すこと", () => {
    expect(isMovePayload({ x: 1 })).toBe(false);
  });

  it("xが文字列の場合はfalseを返すこと", () => {
    expect(isMovePayload({ x: "1", y: 2 })).toBe(false);
  });

  it("yがNaNの場合はfalseを返すこと", () => {
    expect(isMovePayload({ x: 1, y: Number.NaN })).toBe(false);
  });

  it("xがInfinityの場合はfalseを返すこと", () => {
    expect(isMovePayload({ x: Number.POSITIVE_INFINITY, y: 0 })).toBe(false);
  });

  it("nullの場合はfalseを返すこと", () => {
    expect(isMovePayload(null)).toBe(false);
  });

  it("undefinedの場合はfalseを返すこと", () => {
    expect(isMovePayload(undefined)).toBe(false);
  });

  it("数値の場合はfalseを返すこと", () => {
    expect(isMovePayload(1)).toBe(false);
  });

  it("空オブジェクトの場合はfalseを返すこと", () => {
    expect(isMovePayload({})).toBe(false);
  });

  it("座標を持つ配列の場合もtrueを返すこと", () => {
    const arrayWithCoordinates = Object.assign([], { x: 1, y: 2 });

    expect(isMovePayload(arrayWithCoordinates)).toBe(true);
  });
});

describe("isPlaceBombPayload", () => {
  it("設置要求の全フィールドが揃う場合はtrueを返すこと", () => {
    expect(
      isPlaceBombPayload({
        requestId: "req-1",
        x: 1,
        y: 2,
        explodeAtElapsedMs: 3000,
      }),
    ).toBe(true);
  });

  it("requestIdが空文字の場合はfalseを返すこと", () => {
    expect(
      isPlaceBombPayload({
        requestId: "",
        x: 1,
        y: 2,
        explodeAtElapsedMs: 3000,
      }),
    ).toBe(false);
  });

  it("explodeAtElapsedMsが欠落している場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload({ requestId: "req-1", x: 1, y: 2 })).toBe(false);
  });

  it("nullの場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(null)).toBe(false);
  });

  it("undefinedの場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(undefined)).toBe(false);
  });
});

describe("isBombHitReportPayload", () => {
  it("bombIdが非空文字列の場合はtrueを返すこと", () => {
    expect(isBombHitReportPayload({ bombId: "bomb-1" })).toBe(true);
  });

  it("未知のフィールドを含んでもtrueを返すこと", () => {
    expect(isBombHitReportPayload({ bombId: "bomb-1", extra: 1 })).toBe(true);
  });

  it("bombIdが空文字の場合はfalseを返すこと", () => {
    expect(isBombHitReportPayload({ bombId: "" })).toBe(false);
  });

  it("bombIdが空白のみの場合はfalseを返すこと", () => {
    expect(isBombHitReportPayload({ bombId: "  " })).toBe(false);
  });

  it("bombIdが前後に空白を含む場合はtrueを返すこと", () => {
    expect(isBombHitReportPayload({ bombId: " bomb-1 " })).toBe(true);
  });

  it("bombIdが数値の場合はfalseを返すこと", () => {
    expect(isBombHitReportPayload({ bombId: 1 })).toBe(false);
  });

  it("bombIdが欠落している場合はfalseを返すこと", () => {
    expect(isBombHitReportPayload({})).toBe(false);
  });

  it("nullの場合はfalseを返すこと", () => {
    expect(isBombHitReportPayload(null)).toBe(false);
  });

  it("undefinedの場合はfalseを返すこと", () => {
    expect(isBombHitReportPayload(undefined)).toBe(false);
  });

  it("文字列の場合はfalseを返すこと", () => {
    expect(isBombHitReportPayload("bomb-1")).toBe(false);
  });
});

describe("isStartGamePayload", () => {
  it("空オブジェクトの場合はtrueを返すこと", () => {
    expect(isStartGamePayload({})).toBe(true);
  });

  it("targetPlayerCountのみ指定した場合はtrueを返すこと", () => {
    expect(isStartGamePayload({ targetPlayerCount: 4 })).toBe(true);
  });

  it("fieldSizePresetのみ指定した場合はtrueを返すこと", () => {
    expect(isStartGamePayload({ fieldSizePreset: "SMALL" })).toBe(true);
  });

  it("両方指定した場合はtrueを返すこと", () => {
    expect(
      isStartGamePayload({ targetPlayerCount: 8, fieldSizePreset: "XLARGE" }),
    ).toBe(true);
  });

  it("targetPlayerCountが0の場合はfalseを返すこと", () => {
    expect(isStartGamePayload({ targetPlayerCount: 0 })).toBe(false);
  });

  it("targetPlayerCountが1の場合はtrueを返すこと", () => {
    expect(isStartGamePayload({ targetPlayerCount: 1 })).toBe(true);
  });

  it("targetPlayerCountが負値の場合はfalseを返すこと", () => {
    expect(isStartGamePayload({ targetPlayerCount: -1 })).toBe(false);
  });

  it("targetPlayerCountが小数の場合はfalseを返すこと", () => {
    expect(isStartGamePayload({ targetPlayerCount: 2.5 })).toBe(false);
  });

  it("targetPlayerCountが数値文字列の場合はfalseを返すこと", () => {
    expect(isStartGamePayload({ targetPlayerCount: "4" })).toBe(false);
  });

  it("targetPlayerCountがNaNの場合はfalseを返すこと", () => {
    expect(isStartGamePayload({ targetPlayerCount: Number.NaN })).toBe(false);
  });

  it("targetPlayerCountがnullの場合はfalseを返すこと", () => {
    expect(isStartGamePayload({ targetPlayerCount: null })).toBe(false);
  });

  it("targetPlayerCountが上限なく巨大でもtrueを返すこと", () => {
    expect(isStartGamePayload({ targetPlayerCount: 100000 })).toBe(true);
  });

  it("targetPlayerCount未指定でfieldSizePresetが不正な場合はfalseを返すこと", () => {
    expect(isStartGamePayload({ fieldSizePreset: "HUGE" })).toBe(false);
  });

  it("targetPlayerCount未指定でfieldSizePresetがnullの場合はfalseを返すこと", () => {
    expect(isStartGamePayload({ fieldSizePreset: null })).toBe(false);
  });

  it("targetPlayerCount指定でfieldSizePresetが不正な場合はfalseを返すこと", () => {
    expect(
      isStartGamePayload({ targetPlayerCount: 4, fieldSizePreset: "small" }),
    ).toBe(false);
  });

  it("fieldSizePresetがMEDIUMの場合はtrueを返すこと", () => {
    expect(isStartGamePayload({ fieldSizePreset: "MEDIUM" })).toBe(true);
  });

  it("fieldSizePresetがLARGEの場合はtrueを返すこと", () => {
    expect(isStartGamePayload({ fieldSizePreset: "LARGE" })).toBe(true);
  });

  it("targetPlayerCountがundefinedとして明示されてもtrueを返すこと", () => {
    expect(isStartGamePayload({ targetPlayerCount: undefined })).toBe(true);
  });

  it("nullの場合はfalseを返すこと", () => {
    expect(isStartGamePayload(null)).toBe(false);
  });

  it("undefinedの場合はfalseを返すこと", () => {
    expect(isStartGamePayload(undefined)).toBe(false);
  });

  it("数値の場合はfalseを返すこと", () => {
    expect(isStartGamePayload(4)).toBe(false);
  });

  it("空配列の場合はtrueを返すこと", () => {
    expect(isStartGamePayload([])).toBe(true);
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

  it("全フィールドが妥当な場合はtrueを返すこと", () => {
    expect(isLobbySettingsUpdatePayload(createPayload())).toBe(true);
  });

  it("teamAssignmentModeがplayer_selectの場合はtrueを返すこと", () => {
    expect(
      isLobbySettingsUpdatePayload(
        createPayload({ teamAssignmentMode: "player_select" }),
      ),
    ).toBe(true);
  });

  it("未知のフィールドを含んでもtrueを返すこと", () => {
    expect(isLobbySettingsUpdatePayload(createPayload({ extra: true }))).toBe(
      true,
    );
  });

  it("targetPlayerCountが欠落している場合はfalseを返すこと", () => {
    expect(
      isLobbySettingsUpdatePayload({
        fieldSizePreset: "MEDIUM",
        teamAssignmentMode: "random",
      }),
    ).toBe(false);
  });

  it("targetPlayerCountが0の場合はfalseを返すこと", () => {
    expect(
      isLobbySettingsUpdatePayload(createPayload({ targetPlayerCount: 0 })),
    ).toBe(false);
  });

  it("targetPlayerCountが小数の場合はfalseを返すこと", () => {
    expect(
      isLobbySettingsUpdatePayload(createPayload({ targetPlayerCount: 4.5 })),
    ).toBe(false);
  });

  it("fieldSizePresetが欠落している場合はfalseを返すこと", () => {
    expect(
      isLobbySettingsUpdatePayload({
        targetPlayerCount: 4,
        teamAssignmentMode: "random",
      }),
    ).toBe(false);
  });

  it("fieldSizePresetが不正な値の場合はfalseを返すこと", () => {
    expect(
      isLobbySettingsUpdatePayload(createPayload({ fieldSizePreset: "TINY" })),
    ).toBe(false);
  });

  it("fieldSizePresetがSMALLの場合はtrueを返すこと", () => {
    expect(
      isLobbySettingsUpdatePayload(createPayload({ fieldSizePreset: "SMALL" })),
    ).toBe(true);
  });

  it("fieldSizePresetがXLARGEの場合はtrueを返すこと", () => {
    expect(
      isLobbySettingsUpdatePayload(createPayload({ fieldSizePreset: "XLARGE" })),
    ).toBe(true);
  });

  it("teamAssignmentModeが不正な値の場合はfalseを返すこと", () => {
    expect(
      isLobbySettingsUpdatePayload(
        createPayload({ teamAssignmentMode: "auto" }),
      ),
    ).toBe(false);
  });

  it("teamAssignmentModeが欠落している場合はfalseを返すこと", () => {
    expect(
      isLobbySettingsUpdatePayload({
        targetPlayerCount: 4,
        fieldSizePreset: "MEDIUM",
      }),
    ).toBe(false);
  });

  it("nullの場合はfalseを返すこと", () => {
    expect(isLobbySettingsUpdatePayload(null)).toBe(false);
  });

  it("undefinedの場合はfalseを返すこと", () => {
    expect(isLobbySettingsUpdatePayload(undefined)).toBe(false);
  });

  it("空オブジェクトの場合はfalseを返すこと", () => {
    expect(isLobbySettingsUpdatePayload({})).toBe(false);
  });

  it("文字列の場合はfalseを返すこと", () => {
    expect(isLobbySettingsUpdatePayload("settings")).toBe(false);
  });
});

describe("isSelectTeamPayload", () => {
  it("preferredTeamIdがnullの場合はtrueを返すこと", () => {
    expect(isSelectTeamPayload({ preferredTeamId: null })).toBe(true);
  });

  it("preferredTeamIdが0の場合はtrueを返すこと", () => {
    expect(isSelectTeamPayload({ preferredTeamId: 0 })).toBe(true);
  });

  it("preferredTeamIdが正の整数の場合はtrueを返すこと", () => {
    expect(isSelectTeamPayload({ preferredTeamId: 3 })).toBe(true);
  });

  it("preferredTeamIdがチーム数を超える整数でもtrueを返すこと", () => {
    expect(isSelectTeamPayload({ preferredTeamId: 999 })).toBe(true);
  });

  it("preferredTeamIdが負値の場合はfalseを返すこと", () => {
    expect(isSelectTeamPayload({ preferredTeamId: -1 })).toBe(false);
  });

  it("preferredTeamIdが小数の場合はfalseを返すこと", () => {
    expect(isSelectTeamPayload({ preferredTeamId: 1.5 })).toBe(false);
  });

  it("preferredTeamIdが数値文字列の場合はfalseを返すこと", () => {
    expect(isSelectTeamPayload({ preferredTeamId: "1" })).toBe(false);
  });

  it("preferredTeamIdがNaNの場合はfalseを返すこと", () => {
    expect(isSelectTeamPayload({ preferredTeamId: Number.NaN })).toBe(false);
  });

  it("preferredTeamIdが欠落している場合はfalseを返すこと", () => {
    expect(isSelectTeamPayload({})).toBe(false);
  });

  it("nullの場合はfalseを返すこと", () => {
    expect(isSelectTeamPayload(null)).toBe(false);
  });

  it("undefinedの場合はfalseを返すこと", () => {
    expect(isSelectTeamPayload(undefined)).toBe(false);
  });

  it("数値の場合はfalseを返すこと", () => {
    expect(isSelectTeamPayload(1)).toBe(false);
  });
});

describe("isJoinRoomPayload", () => {
  it("roomIdとplayerNameが非空文字列の場合はtrueを返すこと", () => {
    expect(isJoinRoomPayload({ roomId: "room-1", playerName: "taro" })).toBe(
      true,
    );
  });

  it("未知のフィールドを含んでもtrueを返すこと", () => {
    expect(
      isJoinRoomPayload({ roomId: "room-1", playerName: "taro", extra: 1 }),
    ).toBe(true);
  });

  it("roomIdが空文字の場合はfalseを返すこと", () => {
    expect(isJoinRoomPayload({ roomId: "", playerName: "taro" })).toBe(false);
  });

  it("roomIdが空白のみの場合はfalseを返すこと", () => {
    expect(isJoinRoomPayload({ roomId: "   ", playerName: "taro" })).toBe(false);
  });

  it("playerNameが空文字の場合はfalseを返すこと", () => {
    expect(isJoinRoomPayload({ roomId: "room-1", playerName: "" })).toBe(false);
  });

  it("playerNameが空白のみの場合はfalseを返すこと", () => {
    expect(isJoinRoomPayload({ roomId: "room-1", playerName: "\n\t" })).toBe(
      false,
    );
  });

  it("playerNameが前後に空白を含む場合はtrueを返すこと", () => {
    expect(isJoinRoomPayload({ roomId: "room-1", playerName: " taro " })).toBe(
      true,
    );
  });

  it("playerNameが数値の場合はfalseを返すこと", () => {
    expect(isJoinRoomPayload({ roomId: "room-1", playerName: 1 })).toBe(false);
  });

  it("roomIdが欠落している場合はfalseを返すこと", () => {
    expect(isJoinRoomPayload({ playerName: "taro" })).toBe(false);
  });

  it("空オブジェクトの場合はfalseを返すこと", () => {
    expect(isJoinRoomPayload({})).toBe(false);
  });

  it("nullの場合はfalseを返すこと", () => {
    expect(isJoinRoomPayload(null)).toBe(false);
  });

  it("undefinedの場合はfalseを返すこと", () => {
    expect(isJoinRoomPayload(undefined)).toBe(false);
  });

  it("文字列の場合はfalseを返すこと", () => {
    expect(isJoinRoomPayload("room-1")).toBe(false);
  });
});
