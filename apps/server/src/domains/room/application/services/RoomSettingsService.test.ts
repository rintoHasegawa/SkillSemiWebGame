/**
 * RoomSettingsService.test
 * ロビー設定更新サービスの仕様適合を検証するテスト
 * 更新不可条件（未存在・非待機）と，ゲーム人数の妥当性検証・境界値を検証する
 * 目標人数の範囲は SPEC_02（4人刻み・最大100人）と TEAM_COUNT(4) を基準とする
 */
import { domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  logResults,
  logScopes,
  roomDomainLogEvents,
} from "@server/logging/index";
import { RoomSettingsService } from "./RoomSettingsService";

// 仕様上のルーム最大人数（SPEC_02: 目標人数の最大は100人）
const MAX_PLAYERS = 100;

// 仕様上の目標人数の最小値（チーム数4で分割できる最小人数）
const MIN_TARGET_PLAYER_COUNT = 4;

type RoomSeed = {
  status: domain.room.Room["status"];
  maxPlayers?: number;
};

/** 指定フェーズのテスト用ルームを生成する */
const createRoom = ({
  status,
  maxPlayers = MAX_PLAYERS,
}: RoomSeed): domain.room.Room => {
  return {
    roomId: "room-1",
    ownerId: "socket-1",
    players: [],
    status,
    maxPlayers,
    fieldSizePreset: "MEDIUM",
    teamAssignmentMode: "random",
  };
};

/** 指定フェーズのルーム1件を持つサービスを生成する */
const createService = (
  status: domain.room.Room["status"],
  maxPlayers: number = MAX_PLAYERS,
) => {
  const room = createRoom({ status, maxPlayers });
  return {
    room,
    service: new RoomSettingsService(new Map([["room-1", room]])),
  };
};

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RoomSettingsService", () => {
  it("存在しないルームではundefinedを返すこと", () => {
    const service = new RoomSettingsService(new Map());

    expect(
      service.updateLobbySettings("room-x", 8, "LARGE", "player_select"),
    ).toBeUndefined();
  });

  it("プレイ中ルームでは設定を更新せずundefinedを返すこと", () => {
    const { service } = createService(domain.room.RoomPhase.PLAYING);

    expect(
      service.updateLobbySettings("room-1", 8, "LARGE", "player_select"),
    ).toBeUndefined();
  });

  it("プレイ中ルームでは既存設定を書き換えないこと", () => {
    const { room, service } = createService(domain.room.RoomPhase.PLAYING);

    service.updateLobbySettings("room-1", 8, "LARGE", "player_select");

    expect(room.fieldSizePreset).toBe("MEDIUM");
  });

  it("待機中ルームでは更新後のルームを返すこと", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    expect(
      service.updateLobbySettings("room-1", 8, "LARGE", "player_select"),
    ).toBe(room);
  });

  it("ゲーム参加人数を更新すること", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    service.updateLobbySettings("room-1", 8, "LARGE", "player_select");

    expect(room.targetPlayerCount).toBe(8);
  });

  it("フィールドサイズを更新すること", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    service.updateLobbySettings("room-1", 8, "LARGE", "player_select");

    expect(room.fieldSizePreset).toBe("LARGE");
  });

  it("チーム割り当て方式を更新すること", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    service.updateLobbySettings("room-1", 8, "LARGE", "player_select");

    expect(room.teamAssignmentMode).toBe("player_select");
  });

  it("参加人数が下限のチーム数4の場合は更新すること", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    service.updateLobbySettings(
      "room-1",
      MIN_TARGET_PLAYER_COUNT,
      "SMALL",
      "random",
    );

    expect(room.targetPlayerCount).toBe(MIN_TARGET_PLAYER_COUNT);
  });

  it("参加人数がルーム最大人数と同じ場合は更新すること", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    service.updateLobbySettings("room-1", MAX_PLAYERS, "XLARGE", "random");

    expect(room.targetPlayerCount).toBe(MAX_PLAYERS);
  });

  it("参加人数が下限未満の3の場合はundefinedを返すこと", () => {
    const { service } = createService(domain.room.RoomPhase.WAITING);

    expect(
      service.updateLobbySettings(
        "room-1",
        MIN_TARGET_PLAYER_COUNT - 1,
        "SMALL",
        "random",
      ),
    ).toBeUndefined();
  });

  it("参加人数が下限未満の3の場合は参加人数を反映しないこと", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    service.updateLobbySettings(
      "room-1",
      MIN_TARGET_PLAYER_COUNT - 1,
      "SMALL",
      "random",
    );

    expect(room.targetPlayerCount).toBeUndefined();
  });

  it("参加人数がルーム最大人数を超える場合はundefinedを返すこと", () => {
    const { service } = createService(domain.room.RoomPhase.WAITING);

    expect(
      service.updateLobbySettings(
        "room-1",
        MAX_PLAYERS + 1,
        "XLARGE",
        "random",
      ),
    ).toBeUndefined();
  });

  it("参加人数0の場合は反映せずundefinedを返すこと", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    expect(
      service.updateLobbySettings("room-1", 0, "SMALL", "random"),
    ).toBeUndefined();
    expect(room.targetPlayerCount).toBeUndefined();
  });

  it("負の参加人数の場合は反映せずundefinedを返すこと", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    expect(
      service.updateLobbySettings("room-1", -1, "SMALL", "random"),
    ).toBeUndefined();
    expect(room.targetPlayerCount).toBeUndefined();
  });

  it("参加人数が小数の場合はundefinedを返すこと", () => {
    const { service } = createService(domain.room.RoomPhase.WAITING);

    expect(
      service.updateLobbySettings("room-1", 8.5, "SMALL", "random"),
    ).toBeUndefined();
  });

  it("参加人数がNaNの場合はundefinedを返すこと", () => {
    const { service } = createService(domain.room.RoomPhase.WAITING);

    expect(
      service.updateLobbySettings("room-1", Number.NaN, "SMALL", "random"),
    ).toBeUndefined();
  });

  it("参加人数がInfinityの場合はundefinedを返すこと", () => {
    const { service } = createService(domain.room.RoomPhase.WAITING);

    expect(
      service.updateLobbySettings(
        "room-1",
        Number.POSITIVE_INFINITY,
        "SMALL",
        "random",
      ),
    ).toBeUndefined();
  });

  it("参加人数が不正な場合はフィールドサイズも反映しないこと", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    service.updateLobbySettings("room-1", 0, "LARGE", "player_select");

    expect(room.fieldSizePreset).toBe("MEDIUM");
  });

  it("参加人数が不正な場合はチーム割り当て方式も反映しないこと", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    service.updateLobbySettings("room-1", 0, "LARGE", "player_select");

    expect(room.teamAssignmentMode).toBe("random");
  });

  it("参加人数が不正な場合はignored_invalid_payloadを記録すること", () => {
    const { service } = createService(domain.room.RoomPhase.WAITING);

    service.updateLobbySettings("room-1", 0, "LARGE", "player_select");

    expect(logSpy).toHaveBeenCalledWith(
      `[${logScopes.ROOM_SETTINGS_SERVICE}]`,
      {
        event: roomDomainLogEvents.LOBBY_SETTINGS_UPDATE,
        result: logResults.IGNORED_INVALID_PAYLOAD,
        roomId: "room-1",
        targetPlayerCount: 0,
      },
    );
  });

  it("参加人数が妥当な場合はログを記録しないこと", () => {
    const { service } = createService(domain.room.RoomPhase.WAITING);

    service.updateLobbySettings("room-1", 8, "LARGE", "player_select");

    expect(logSpy).not.toHaveBeenCalled();
  });
});
