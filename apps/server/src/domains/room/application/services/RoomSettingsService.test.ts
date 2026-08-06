/**
 * RoomSettingsService.test
 * ロビー設定更新サービスの現行挙動を固定する characterization test
 * 更新不可条件（未存在・非待機）と更新内容の反映を検証する
 */
import { domain } from "@repo/shared";
import { describe, expect, it } from "vitest";

import { RoomSettingsService } from "./RoomSettingsService";

/** 指定フェーズのテスト用ルームを生成する */
const createRoom = (status: domain.room.Room["status"]): domain.room.Room => {
  return {
    roomId: "room-1",
    ownerId: "socket-1",
    players: [],
    status,
    maxPlayers: 4,
    fieldSizePreset: "MEDIUM",
    teamAssignmentMode: "random",
  };
};

/** 指定フェーズのルーム1件を持つサービスを生成する */
const createService = (status: domain.room.Room["status"]) => {
  const room = createRoom(status);
  return {
    room,
    service: new RoomSettingsService(new Map([["room-1", room]])),
  };
};

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

  it("参加人数0も検証せずそのまま反映すること", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    service.updateLobbySettings("room-1", 0, "SMALL", "random");

    expect(room.targetPlayerCount).toBe(0);
  });

  it("負の参加人数も検証せずそのまま反映すること", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    service.updateLobbySettings("room-1", -1, "SMALL", "random");

    expect(room.targetPlayerCount).toBe(-1);
  });
});
