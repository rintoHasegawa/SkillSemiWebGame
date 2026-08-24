/**
 * lobbySettingsSync.test
 * ロビー設定の同期判定が仕様どおりに働くことを検証する
 * オーナー移譲直後に既定値でルーム設定が巻き戻る不具合を回帰防止する
 */
import { describe, expect, it } from "vitest";
import {
  isSameLobbyGameSettings,
  resolveGameSettingsFromRoom,
  resolveStartGameRequest,
  shouldPushLobbySettings,
  type LobbyGameSettings,
  type LobbyRoomSettings,
} from "./lobbySettingsSync";

// ホスト側の既定値相当（人数4・MEDIUM・ランダム割り当て）
const createLocalSettings = (
  overrides: Partial<LobbyGameSettings> = {},
): LobbyGameSettings => ({
  targetPlayerCount: 4,
  fieldSizePreset: "MEDIUM",
  teamAssignmentMode: "random",
  ...overrides,
});

// 前オーナーが設定済みのルーム相当（人数8・LARGE・チーム選択）
const createRoomSettings = (
  overrides: Partial<LobbyRoomSettings> = {},
): LobbyRoomSettings => ({
  targetPlayerCount: 8,
  fieldSizePreset: "LARGE",
  teamAssignmentMode: "player_select",
  ...overrides,
});

// サーバー由来の想定外値を再現するため型を外した形から組み立てる
const createRawRoomSettings = (
  raw: Record<string, unknown>,
): LobbyRoomSettings => raw as unknown as LobbyRoomSettings;

describe("resolveGameSettingsFromRoom", () => {
  it("roomの現在設定をそのまま採用すること", () => {
    expect(
      resolveGameSettingsFromRoom(createRoomSettings(), createLocalSettings()),
    ).toEqual({
      targetPlayerCount: 8,
      fieldSizePreset: "LARGE",
      teamAssignmentMode: "player_select",
    });
  });

  it("roomの目標人数がundefinedならdefaultsの値へフォールバックすること", () => {
    const resolved = resolveGameSettingsFromRoom(
      createRoomSettings({ targetPlayerCount: undefined }),
      createLocalSettings(),
    );

    expect(resolved.targetPlayerCount).toBe(4);
  });

  it("roomの目標人数がnullならdefaultsの値へフォールバックすること", () => {
    const resolved = resolveGameSettingsFromRoom(
      createRawRoomSettings({
        targetPlayerCount: null,
        fieldSizePreset: "LARGE",
        teamAssignmentMode: "player_select",
      }),
      createLocalSettings(),
    );

    expect(resolved.targetPlayerCount).toBe(4);
  });

  it("roomのフィールドサイズが不正な文字列ならdefaultsの値へフォールバックすること", () => {
    const resolved = resolveGameSettingsFromRoom(
      createRawRoomSettings({
        targetPlayerCount: 8,
        fieldSizePreset: "HUGE",
        teamAssignmentMode: "player_select",
      }),
      createLocalSettings(),
    );

    expect(resolved.fieldSizePreset).toBe("MEDIUM");
  });

  it("roomの割り当て方式が不正な文字列ならdefaultsの値へフォールバックすること", () => {
    const resolved = resolveGameSettingsFromRoom(
      createRawRoomSettings({
        targetPlayerCount: 8,
        fieldSizePreset: "LARGE",
        teamAssignmentMode: "auto",
      }),
      createLocalSettings(),
    );

    expect(resolved.teamAssignmentMode).toBe("random");
  });

  it("引数のオブジェクトを変更せず新しいオブジェクトを返すこと", () => {
    const roomSettings = createRoomSettings();
    const defaults = createLocalSettings();

    const resolved = resolveGameSettingsFromRoom(roomSettings, defaults);

    expect(resolved).not.toBe(defaults);
    expect(roomSettings).toEqual(createRoomSettings());
    expect(defaults).toEqual(createLocalSettings());
  });
});

describe("isSameLobbyGameSettings", () => {
  it("3フィールドすべて同値ならtrueを返すこと", () => {
    expect(
      isSameLobbyGameSettings(createLocalSettings(), createLocalSettings()),
    ).toBe(true);
  });

  it("目標人数だけが異なればfalseを返すこと", () => {
    expect(
      isSameLobbyGameSettings(
        createLocalSettings(),
        createLocalSettings({ targetPlayerCount: 8 }),
      ),
    ).toBe(false);
  });

  it("フィールドサイズだけが異なればfalseを返すこと", () => {
    expect(
      isSameLobbyGameSettings(
        createLocalSettings(),
        createLocalSettings({ fieldSizePreset: "LARGE" }),
      ),
    ).toBe(false);
  });

  it("割り当て方式だけが異なればfalseを返すこと", () => {
    expect(
      isSameLobbyGameSettings(
        createLocalSettings(),
        createLocalSettings({ teamAssignmentMode: "player_select" }),
      ),
    ).toBe(false);
  });
});

describe("shouldPushLobbySettings", () => {
  it("オーナーでないときは送信しないこと", () => {
    expect(
      shouldPushLobbySettings({
        isMeOwner: false,
        hasAdoptedRoomSettings: true,
        roomSettings: createRoomSettings(),
        localSettings: createLocalSettings(),
        lastPushedSettings: null,
      }),
    ).toBe(false);
  });

  it("room設定の取り込み前は既定値で巻き戻るため送信しないこと", () => {
    expect(
      shouldPushLobbySettings({
        isMeOwner: true,
        hasAdoptedRoomSettings: false,
        roomSettings: createRoomSettings(),
        localSettings: createLocalSettings(),
        lastPushedSettings: null,
      }),
    ).toBe(false);
  });

  it("取り込み済みでローカルがroomと一致しているときは送信しないこと", () => {
    expect(
      shouldPushLobbySettings({
        isMeOwner: true,
        hasAdoptedRoomSettings: true,
        roomSettings: createRoomSettings(),
        localSettings: createLocalSettings({
          targetPlayerCount: 8,
          fieldSizePreset: "LARGE",
          teamAssignmentMode: "player_select",
        }),
        lastPushedSettings: null,
      }),
    ).toBe(false);
  });

  it("ホストがモーダルで設定を変更したときは送信すること", () => {
    expect(
      shouldPushLobbySettings({
        isMeOwner: true,
        hasAdoptedRoomSettings: true,
        roomSettings: createRoomSettings(),
        localSettings: createLocalSettings({
          targetPlayerCount: 12,
          fieldSizePreset: "LARGE",
          teamAssignmentMode: "player_select",
        }),
        lastPushedSettings: createLocalSettings({
          targetPlayerCount: 8,
          fieldSizePreset: "LARGE",
          teamAssignmentMode: "player_select",
        }),
      }),
    ).toBe(true);
  });

  it("roomの目標人数が未設定のときは初回送信として送信すること", () => {
    expect(
      shouldPushLobbySettings({
        isMeOwner: true,
        hasAdoptedRoomSettings: true,
        roomSettings: createRoomSettings({ targetPlayerCount: undefined }),
        localSettings: createLocalSettings({
          fieldSizePreset: "LARGE",
          teamAssignmentMode: "player_select",
        }),
        lastPushedSettings: null,
      }),
    ).toBe(true);
  });

  it("直近に送信した設定と同値なら再送しないこと", () => {
    const localSettings = createLocalSettings();

    expect(
      shouldPushLobbySettings({
        isMeOwner: true,
        hasAdoptedRoomSettings: true,
        roomSettings: createRoomSettings(),
        localSettings,
        lastPushedSettings: createLocalSettings(),
      }),
    ).toBe(false);
  });

  it("未送信でroomと差分があるときは送信すること", () => {
    expect(
      shouldPushLobbySettings({
        isMeOwner: true,
        hasAdoptedRoomSettings: true,
        roomSettings: createRoomSettings(),
        localSettings: createLocalSettings(),
        lastPushedSettings: null,
      }),
    ).toBe(true);
  });
});

describe("resolveStartGameRequest", () => {
  it("取り込み済みのときはローカル設定の値を返すこと", () => {
    expect(
      resolveStartGameRequest({
        hasAdoptedRoomSettings: true,
        roomSettings: createRoomSettings(),
        localSettings: createLocalSettings({
          targetPlayerCount: 12,
          fieldSizePreset: "XLARGE",
        }),
      }),
    ).toEqual({ targetPlayerCount: 12, fieldSizePreset: "XLARGE" });
  });

  it("取り込み前のときはroomの現在設定を返すこと", () => {
    expect(
      resolveStartGameRequest({
        hasAdoptedRoomSettings: false,
        roomSettings: createRoomSettings(),
        localSettings: createLocalSettings(),
      }),
    ).toEqual({ targetPlayerCount: 8, fieldSizePreset: "LARGE" });
  });

  it("取り込み前でroomの目標人数が未設定ならローカルの値へフォールバックすること", () => {
    expect(
      resolveStartGameRequest({
        hasAdoptedRoomSettings: false,
        roomSettings: createRoomSettings({ targetPlayerCount: undefined }),
        localSettings: createLocalSettings(),
      }).targetPlayerCount,
    ).toBe(4);
  });

  it("戻り値が目標人数とフィールドサイズのみを持つこと", () => {
    const request = resolveStartGameRequest({
      hasAdoptedRoomSettings: true,
      roomSettings: createRoomSettings(),
      localSettings: createLocalSettings(),
    });

    expect(Object.keys(request).sort()).toEqual([
      "fieldSizePreset",
      "targetPlayerCount",
    ]);
  });
});
