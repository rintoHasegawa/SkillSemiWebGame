/**
 * roomEventOrchestrators.test
 * ルーム受信イベント調停の仕様を検証するテスト
 * ロビー設定更新の差分スキップと非適用ログ・チーム選択の全status分岐・
 * 参加結果ごとのログを検証する
 */
import { domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  JoinRoomResult,
  SelectTeamResult,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import {
  logResults,
  logScopes,
  roomUseCaseLogEvents,
} from "@server/logging/index";
import type {
  LobbySettingsUpdateEventRoomUseCasePort,
  SelectTeamEventRoomUseCasePort,
} from "@server/network/types/connectionPorts";
import {
  createRoom as createRoomFixture,
  createRoomMember,
} from "@server/testing/roomFixtures";
import type { RoomOutputAdapter } from "./createRoomOutputAdapter";
import {
  handleJoinRoomEvent,
  handleLobbySettingsUpdateEvent,
  handleSelectTeamEvent,
} from "./roomEventOrchestrators";

type RoomParams = {
  targetPlayerCount?: number;
  fieldSizePreset?: domain.room.Room["fieldSizePreset"];
  teamAssignmentMode?: domain.room.TeamAssignmentMode;
};

/** ロビー設定値を指定してテスト用のルーム状態を生成する */
const createRoom = ({
  targetPlayerCount = 4,
  fieldSizePreset = "MEDIUM",
  teamAssignmentMode = "random",
}: RoomParams = {}): domain.room.Room => {
  return createRoomFixture({
    players: [createRoomMember({ name: "name-1", isOwner: true })],
    maxPlayers: 100,
    fieldSizePreset,
    targetPlayerCount,
    teamAssignmentMode,
  });
};

/** 送信内容を記録するルーム出力アダプタースタブを生成する */
const createOutputStub = () => {
  return {
    publishRoomUpdateToRoom: vi.fn<
      RoomOutputAdapter["publishRoomUpdateToRoom"]
    >(),
    publishJoinRejectedToSocket: vi.fn<
      RoomOutputAdapter["publishJoinRejectedToSocket"]
    >(),
    publishSelectTeamRejectedToSocket: vi.fn<
      RoomOutputAdapter["publishSelectTeamRejectedToSocket"]
    >(),
  } satisfies RoomOutputAdapter;
};

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

type LobbySettingsDepsParams = {
  currentRoom: domain.room.Room | undefined;
  updatedRoom: domain.room.Room | undefined;
};

/** オーナー参照と更新結果を固定した依存集合スタブを生成する */
const createLobbySettingsDeps = ({
  currentRoom,
  updatedRoom,
}: LobbySettingsDepsParams) => {
  return {
    socketId: "socket-1",
    roomManager: {
      getRoomByOwnerId: vi.fn<
        LobbySettingsUpdateEventRoomUseCasePort["getRoomByOwnerId"]
      >(() => currentRoom),
      updateLobbySettings: vi.fn<
        LobbySettingsUpdateEventRoomUseCasePort["updateLobbySettings"]
      >(() => updatedRoom),
    },
    output: createOutputStub(),
  };
};

describe("handleLobbySettingsUpdateEvent", () => {
  it("設定が変化した場合は更新後ルームを全員へ配信すること", () => {
    const updatedRoom = createRoom({ targetPlayerCount: 8 });
    const deps = createLobbySettingsDeps({
      currentRoom: createRoom(),
      updatedRoom,
    });

    handleLobbySettingsUpdateEvent(deps, {
      targetPlayerCount: 8,
      fieldSizePreset: "MEDIUM",
      teamAssignmentMode: "random",
    });

    expect(deps.output.publishRoomUpdateToRoom).toHaveBeenCalledWith(
      "room-1",
      updatedRoom,
    );
  });

  it("受信した設定値でルーム更新を依頼すること", () => {
    const deps = createLobbySettingsDeps({
      currentRoom: createRoom(),
      updatedRoom: createRoom(),
    });

    handleLobbySettingsUpdateEvent(deps, {
      targetPlayerCount: 8,
      fieldSizePreset: "LARGE",
      teamAssignmentMode: "player_select",
    });

    expect(deps.roomManager.updateLobbySettings).toHaveBeenCalledWith(
      "room-1",
      8,
      "LARGE",
      "player_select",
    );
  });

  it("オーナーのルームが無い場合は更新しないこと", () => {
    const deps = createLobbySettingsDeps({
      currentRoom: undefined,
      updatedRoom: createRoom(),
    });

    handleLobbySettingsUpdateEvent(deps, {
      targetPlayerCount: 8,
      fieldSizePreset: "LARGE",
      teamAssignmentMode: "random",
    });

    expect(deps.roomManager.updateLobbySettings).not.toHaveBeenCalled();
    expect(deps.output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("全設定値が現在値と同じ場合は更新も配信もしないこと", () => {
    const deps = createLobbySettingsDeps({
      currentRoom: createRoom(),
      updatedRoom: createRoom(),
    });

    handleLobbySettingsUpdateEvent(deps, {
      targetPlayerCount: 4,
      fieldSizePreset: "MEDIUM",
      teamAssignmentMode: "random",
    });

    expect(deps.roomManager.updateLobbySettings).not.toHaveBeenCalled();
    expect(deps.output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("チーム割り当て方式だけが変化した場合も更新すること", () => {
    const deps = createLobbySettingsDeps({
      currentRoom: createRoom(),
      updatedRoom: createRoom(),
    });

    handleLobbySettingsUpdateEvent(deps, {
      targetPlayerCount: 4,
      fieldSizePreset: "MEDIUM",
      teamAssignmentMode: "player_select",
    });

    expect(deps.roomManager.updateLobbySettings).toHaveBeenCalled();
  });

  it("更新結果が取得できない場合は配信しないこと", () => {
    const deps = createLobbySettingsDeps({
      currentRoom: createRoom(),
      updatedRoom: undefined,
    });

    handleLobbySettingsUpdateEvent(deps, {
      targetPlayerCount: 8,
      fieldSizePreset: "MEDIUM",
      teamAssignmentMode: "random",
    });

    expect(deps.output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("オーナーのルームが無い場合はignored_missing_roomを記録すること", () => {
    const deps = createLobbySettingsDeps({
      currentRoom: undefined,
      updatedRoom: createRoom(),
    });

    handleLobbySettingsUpdateEvent(deps, {
      targetPlayerCount: 8,
      fieldSizePreset: "LARGE",
      teamAssignmentMode: "random",
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: roomUseCaseLogEvents.LOBBY_SETTINGS_UPDATE,
      result: logResults.IGNORED_MISSING_ROOM,
      socketId: "socket-1",
    });
  });

  it("全設定値が現在値と同じ場合はignored_no_changeを記録すること", () => {
    const deps = createLobbySettingsDeps({
      currentRoom: createRoom(),
      updatedRoom: createRoom(),
    });

    handleLobbySettingsUpdateEvent(deps, {
      targetPlayerCount: 4,
      fieldSizePreset: "MEDIUM",
      teamAssignmentMode: "random",
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: roomUseCaseLogEvents.LOBBY_SETTINGS_UPDATE,
      result: logResults.IGNORED_NO_CHANGE,
      socketId: "socket-1",
      roomId: "room-1",
    });
  });

  it("更新結果が取得できない場合はignored_update_failedを記録すること", () => {
    const deps = createLobbySettingsDeps({
      currentRoom: createRoom(),
      updatedRoom: undefined,
    });

    handleLobbySettingsUpdateEvent(deps, {
      targetPlayerCount: 8,
      fieldSizePreset: "MEDIUM",
      teamAssignmentMode: "random",
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: roomUseCaseLogEvents.LOBBY_SETTINGS_UPDATE,
      result: logResults.IGNORED_UPDATE_FAILED,
      socketId: "socket-1",
      roomId: "room-1",
    });
  });

  it("設定が変化して更新できた場合は非適用ログを記録しないこと", () => {
    const deps = createLobbySettingsDeps({
      currentRoom: createRoom(),
      updatedRoom: createRoom({ targetPlayerCount: 8 }),
    });

    handleLobbySettingsUpdateEvent(deps, {
      targetPlayerCount: 8,
      fieldSizePreset: "MEDIUM",
      teamAssignmentMode: "random",
    });

    expect(logSpy).not.toHaveBeenCalledWith(
      `[${logScopes.NETWORK}]`,
      expect.objectContaining({
        event: roomUseCaseLogEvents.LOBBY_SETTINGS_UPDATE,
      }),
    );
  });
});

/** チーム選択結果を固定した依存集合スタブを生成する */
const createSelectTeamDeps = (result: SelectTeamResult) => {
  return {
    socketId: "socket-1",
    roomManager: {
      selectTeam: vi.fn<SelectTeamEventRoomUseCasePort["selectTeam"]>(
        () => result,
      ),
    },
    output: createOutputStub(),
  };
};

describe("handleSelectTeamEvent", () => {
  it("選択が成立した場合は更新後ルームを全員へ配信すること", () => {
    const room = createRoom();
    const deps = createSelectTeamDeps({ status: "ok", room });

    handleSelectTeamEvent(deps, { preferredTeamId: 1 });

    expect(deps.output.publishRoomUpdateToRoom).toHaveBeenCalledWith(
      "room-1",
      room,
    );
  });

  it("受信した希望チームIDで選択処理を依頼すること", () => {
    const deps = createSelectTeamDeps({ status: "ok", room: createRoom() });

    handleSelectTeamEvent(deps, { preferredTeamId: 2 });

    expect(deps.roomManager.selectTeam).toHaveBeenCalledWith("socket-1", 2);
  });

  it("チーム満員の場合は拒否通知を送ること", () => {
    const deps = createSelectTeamDeps({ status: "team_full", teamId: 3 });

    handleSelectTeamEvent(deps, { preferredTeamId: 3 });

    expect(deps.output.publishSelectTeamRejectedToSocket).toHaveBeenCalledWith(
      3,
    );
  });

  it("チーム満員の場合はルーム更新を配信しないこと", () => {
    const deps = createSelectTeamDeps({ status: "team_full", teamId: 3 });

    handleSelectTeamEvent(deps, { preferredTeamId: 3 });

    expect(deps.output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("対象が見つからない場合は何も配信しないこと", () => {
    const deps = createSelectTeamDeps({ status: "not_found" });

    handleSelectTeamEvent(deps, { preferredTeamId: null });

    expect(deps.output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
    expect(deps.output.publishSelectTeamRejectedToSocket).not.toHaveBeenCalled();
  });

  it("チームIDが範囲外の場合はルーム更新を配信しないこと", () => {
    const deps = createSelectTeamDeps({ status: "invalid_team" });

    handleSelectTeamEvent(deps, { preferredTeamId: 99 });

    expect(deps.output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("チームIDが範囲外の場合は拒否通知を送らないこと", () => {
    const deps = createSelectTeamDeps({ status: "invalid_team" });

    handleSelectTeamEvent(deps, { preferredTeamId: 99 });

    expect(deps.output.publishSelectTeamRejectedToSocket).not.toHaveBeenCalled();
  });

  it("対象が見つからない場合はignored_missing_roomを記録すること", () => {
    const deps = createSelectTeamDeps({ status: "not_found" });

    handleSelectTeamEvent(deps, { preferredTeamId: null });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: roomUseCaseLogEvents.SELECT_TEAM,
      result: logResults.IGNORED_MISSING_ROOM,
      socketId: "socket-1",
    });
  });

  it("チームIDが範囲外の場合はignored_invalid_payloadを記録すること", () => {
    const deps = createSelectTeamDeps({ status: "invalid_team" });

    handleSelectTeamEvent(deps, { preferredTeamId: 99 });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: roomUseCaseLogEvents.SELECT_TEAM,
      result: logResults.IGNORED_INVALID_PAYLOAD,
      socketId: "socket-1",
    });
  });
});

type JoinDepsParams = {
  status: JoinRoomResult["status"];
};

/** 参加結果を固定した依存集合スタブを生成する */
const createJoinDeps = ({ status }: JoinDepsParams) => {
  const room = createRoom();

  return {
    socketId: "socket-1",
    roomManager: {
      addPlayerToRoom: vi.fn<() => JoinRoomResult>(() => ({ room, status })),
    },
    runtimeRegistry: {
      ensureGameManagerForRoom: vi.fn<(roomId: string) => void>(),
    },
    output: createOutputStub(),
    joinRoom: vi.fn<(roomId: string) => Promise<void>>(() => Promise.resolve()),
    room,
  };
};

const joinPayload: domain.room.JoinRoomPayload = {
  roomId: "room-1",
  playerName: "太郎",
};

describe("handleJoinRoomEvent", () => {
  it("参加成功時はソケットをルームへ参加させること", async () => {
    const deps = createJoinDeps({ status: "joined" });

    await handleJoinRoomEvent(deps, joinPayload);

    expect(deps.joinRoom).toHaveBeenCalledWith("room-1");
  });

  it("参加成功時は更新後ルームを全員へ配信すること", async () => {
    const deps = createJoinDeps({ status: "joined" });

    await handleJoinRoomEvent(deps, joinPayload);

    expect(deps.output.publishRoomUpdateToRoom).toHaveBeenCalledWith(
      "room-1",
      deps.room,
    );
  });

  it("参加成功時はルーム更新の配信を記録すること", async () => {
    const deps = createJoinDeps({ status: "joined" });

    await handleJoinRoomEvent(deps, joinPayload);

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.ROOM_USE_CASE}]`, {
      event: roomUseCaseLogEvents.ROOM_UPDATE,
      result: logResults.EMITTED,
      roomId: "room-1",
      socketId: "socket-1",
      ownerId: "socket-1",
      totalPlayers: 1,
    });
  });

  it("満員の場合はrejected_room_fullを記録すること", async () => {
    const deps = createJoinDeps({ status: "full" });

    await handleJoinRoomEvent(deps, joinPayload);

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: roomUseCaseLogEvents.JOIN_ROOM,
      result: logResults.REJECTED_ROOM_FULL,
      roomId: "room-1",
      socketId: "socket-1",
    });
  });

  it("ゲーム進行中の場合はrejected_room_playingを記録すること", async () => {
    const deps = createJoinDeps({ status: "playing" });

    await handleJoinRoomEvent(deps, joinPayload);

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: roomUseCaseLogEvents.JOIN_ROOM,
      result: logResults.REJECTED_ROOM_PLAYING,
      roomId: "room-1",
      socketId: "socket-1",
    });
  });

  it("重複参加の場合はrejected_duplicateを記録すること", async () => {
    const deps = createJoinDeps({ status: "duplicate" });

    await handleJoinRoomEvent(deps, joinPayload);

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: roomUseCaseLogEvents.JOIN_ROOM,
      result: logResults.REJECTED_DUPLICATE,
      roomId: "room-1",
      socketId: "socket-1",
    });
  });

  it("参加失敗時はソケットをルームへ参加させないこと", async () => {
    const deps = createJoinDeps({ status: "full" });

    await handleJoinRoomEvent(deps, joinPayload);

    expect(deps.joinRoom).not.toHaveBeenCalled();
    expect(deps.output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("参加失敗時は拒否理由付きで参加拒否を通知すること", async () => {
    const deps = createJoinDeps({ status: "duplicate" });

    await handleJoinRoomEvent(deps, joinPayload);

    expect(deps.output.publishJoinRejectedToSocket).toHaveBeenCalledWith({
      roomId: "room-1",
      reason: "duplicate",
    });
  });

  it("参加成功時のみゲームランタイムを確保すること", async () => {
    const joinedDeps = createJoinDeps({ status: "joined" });
    const rejectedDeps = createJoinDeps({ status: "full" });

    await handleJoinRoomEvent(joinedDeps, joinPayload);
    await handleJoinRoomEvent(rejectedDeps, joinPayload);

    expect(
      joinedDeps.runtimeRegistry.ensureGameManagerForRoom,
    ).toHaveBeenCalledWith("room-1");
    expect(
      rejectedDeps.runtimeRegistry.ensureGameManagerForRoom,
    ).not.toHaveBeenCalled();
  });

  it("ルーム参加処理の完了後にルーム更新を配信すること", async () => {
    const deps = createJoinDeps({ status: "joined" });

    await handleJoinRoomEvent(deps, joinPayload);

    const joinOrder = deps.joinRoom.mock.invocationCallOrder[0] ?? 0;
    const publishOrder =
      deps.output.publishRoomUpdateToRoom.mock.invocationCallOrder[0] ?? 0;
    expect(joinOrder).toBeLessThan(publishOrder);
  });
});
