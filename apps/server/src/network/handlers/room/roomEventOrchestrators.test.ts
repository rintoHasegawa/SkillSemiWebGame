/**
 * roomEventOrchestrators.test
 * ルーム受信イベント調停の仕様を検証するテスト
 * ロビー設定更新の差分スキップと非適用ログ・チーム選択の全status分岐・
 * 参加結果ごとのログを検証する
 * 試合復帰（RESUME_SESSION）の全status分岐と明示退室（LEAVE_ROOM）の後始末も対象とする
 */
import { domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  JoinRoomResult,
  RestorePlayerParams,
  RestorePlayerResult,
  RoomDisconnectResult,
  RoomScopedGamePort,
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
  PlayerIdentityRegistry,
  SessionReservationRegistry,
} from "@server/network/identity";
import { createRoomScopedGamePortStub } from "@server/testing/gamePortFixtures";
import {
  createRoom as createRoomFixture,
  createRoomMember,
} from "@server/testing/roomFixtures";
import type { RoomOutputAdapter } from "./createRoomOutputAdapter";
import {
  handleJoinRoomEvent,
  handleLeaveRoomEvent,
  handleLobbySettingsUpdateEvent,
  handleResumeSessionEvent,
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
    publishSessionResumedToSocket: vi.fn<
      RoomOutputAdapter["publishSessionResumedToSocket"]
    >(),
    publishResumeSessionRejectedToSocket: vi.fn<
      RoomOutputAdapter["publishResumeSessionRejectedToSocket"]
    >(),
    closeRoomChannel: vi.fn<RoomOutputAdapter["closeRoomChannel"]>(),
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

  it("参加成功時は前後空白を除去したルームIDへソケットを参加させること", async () => {
    const deps = createJoinDeps({ status: "joined" });

    await handleJoinRoomEvent(deps, {
      roomId: "  room-1  ",
      playerName: "太郎",
    });

    expect(deps.joinRoom).toHaveBeenCalledWith("room-1");
  });

  it("参加成功時は前後空白を除去したルームIDへ更新後ルームを配信すること", async () => {
    const deps = createJoinDeps({ status: "joined" });

    await handleJoinRoomEvent(deps, {
      roomId: "  room-1  ",
      playerName: "太郎",
    });

    expect(deps.output.publishRoomUpdateToRoom).toHaveBeenCalledWith(
      "room-1",
      deps.room,
    );
  });
});

type ResumeDepsParams = {
  /** 予約に登録するトークン（未指定なら予約しない） */
  reservedToken?: string;
  /** ゲームランタイムを解決できない状況を再現するか */
  missingGameManager?: boolean;
  restoreResult?: RestorePlayerResult;
};

/** 復帰調停の依存集合スタブを生成する（レジストリは実装をそのまま使う） */
const createResumeSessionDeps = ({
  reservedToken,
  missingGameManager = false,
  restoreResult,
}: ResumeDepsParams = {}) => {
  const restoredRoom = createRoomFixture({
    players: [createRoomMember({ id: "player-1", name: "太郎" })],
  });
  const sessionReservations = new SessionReservationRegistry();
  if (reservedToken) {
    sessionReservations.reserve(reservedToken, {
      playerId: "player-1",
      roomId: "room-1",
      playerName: "太郎",
      teamId: 1,
    });
  }

  return {
    socketId: "socket-2",
    roomManager: {
      restorePlayerToRoom: vi.fn<
        (params: RestorePlayerParams) => RestorePlayerResult
      >(() => restoreResult ?? { status: "restored", room: restoredRoom }),
    },
    runtimeRegistry: {
      getGameManagerByRoomId: vi.fn<
        (roomId: string) => RoomScopedGamePort | undefined
      >(() =>
        missingGameManager ? undefined : createRoomScopedGamePortStub(),
      ),
    },
    sessionReservations,
    identityRegistry: new PlayerIdentityRegistry(),
    output: createOutputStub(),
    joinRoomChannel: vi.fn<(roomId: string) => Promise<void>>(() =>
      Promise.resolve(),
    ),
    restoredRoom,
  };
};

describe("handleResumeSessionEvent", () => {
  it("復帰できた場合は復帰受理をソケットへ通知すること", async () => {
    const deps = createResumeSessionDeps({ reservedToken: "token-1" });

    await handleResumeSessionEvent({ ...deps, sessionToken: "token-1" });

    expect(deps.output.publishSessionResumedToSocket).toHaveBeenCalledWith({
      playerId: "player-1",
      room: deps.restoredRoom,
    });
  });

  it("復帰できた場合は拒否通知を送らないこと", async () => {
    const deps = createResumeSessionDeps({ reservedToken: "token-1" });

    await handleResumeSessionEvent({ ...deps, sessionToken: "token-1" });

    expect(
      deps.output.publishResumeSessionRejectedToSocket,
    ).not.toHaveBeenCalled();
  });

  it("予約が無い場合は理由 expired で拒否を通知すること", async () => {
    const deps = createResumeSessionDeps();

    await handleResumeSessionEvent({ ...deps, sessionToken: "token-1" });

    expect(
      deps.output.publishResumeSessionRejectedToSocket,
    ).toHaveBeenCalledWith("expired");
  });

  it("トークン未提示の場合は理由 expired で拒否を通知すること", async () => {
    const deps = createResumeSessionDeps({ reservedToken: "token-1" });

    await handleResumeSessionEvent({ ...deps, sessionToken: undefined });

    expect(
      deps.output.publishResumeSessionRejectedToSocket,
    ).toHaveBeenCalledWith("expired");
  });

  it("予約が無い場合は復帰受理を通知しないこと", async () => {
    const deps = createResumeSessionDeps();

    await handleResumeSessionEvent({ ...deps, sessionToken: "token-1" });

    expect(deps.output.publishSessionResumedToSocket).not.toHaveBeenCalled();
  });

  it("ゲームランタイムを解決できない場合は理由 game_ended で拒否を通知すること", async () => {
    const deps = createResumeSessionDeps({
      reservedToken: "token-1",
      missingGameManager: true,
    });

    await handleResumeSessionEvent({ ...deps, sessionToken: "token-1" });

    expect(
      deps.output.publishResumeSessionRejectedToSocket,
    ).toHaveBeenCalledWith("game_ended");
  });

  it("ルームが消滅している場合は理由 game_ended で拒否を通知すること", async () => {
    const deps = createResumeSessionDeps({
      reservedToken: "token-1",
      restoreResult: { status: "not_found" },
    });

    await handleResumeSessionEvent({ ...deps, sessionToken: "token-1" });

    expect(
      deps.output.publishResumeSessionRejectedToSocket,
    ).toHaveBeenCalledWith("game_ended");
  });

  it("復帰できた場合は emitted を記録すること", async () => {
    const deps = createResumeSessionDeps({ reservedToken: "token-1" });

    await handleResumeSessionEvent({ ...deps, sessionToken: "token-1" });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: roomUseCaseLogEvents.RESUME_SESSION,
      result: logResults.EMITTED,
      socketId: "socket-2",
    });
  });

  it("予約が無い場合は rejected_session_expired を記録すること", async () => {
    const deps = createResumeSessionDeps();

    await handleResumeSessionEvent({ ...deps, sessionToken: "token-1" });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: roomUseCaseLogEvents.RESUME_SESSION,
      result: logResults.REJECTED_SESSION_EXPIRED,
      socketId: "socket-2",
    });
  });

  it("ゲームランタイムを解決できない場合は rejected_game_ended を記録すること", async () => {
    const deps = createResumeSessionDeps({
      reservedToken: "token-1",
      missingGameManager: true,
    });

    await handleResumeSessionEvent({ ...deps, sessionToken: "token-1" });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: roomUseCaseLogEvents.RESUME_SESSION,
      result: logResults.REJECTED_GAME_ENDED,
      socketId: "socket-2",
    });
  });
});

type LeaveDepsParams = {
  /** 退室要求元が所属しているルーム（未指定なら所属なし） */
  room?: domain.room.Room;
  /** 予約に登録するトークン（未指定なら予約しない） */
  reservedToken?: string;
};

/** 明示退室調停の依存集合スタブを生成する（レジストリは実装をそのまま使う） */
const createLeaveRoomDeps = ({ room, reservedToken }: LeaveDepsParams = {}) => {
  const sessionReservations = new SessionReservationRegistry();
  if (reservedToken) {
    sessionReservations.reserve(reservedToken, {
      playerId: "player-1",
      roomId: "room-1",
      playerName: "太郎",
      teamId: 1,
    });
  }

  const identityRegistry = new PlayerIdentityRegistry();
  identityRegistry.bind("socket-2", "player-1");

  return {
    playerId: "player-1",
    socketId: "socket-2",
    roomManager: {
      getRoomByPlayerId: vi.fn<
        (playerId: string) => domain.room.Room | undefined
      >(() => room),
      removePlayer: vi.fn<(socketId: string) => RoomDisconnectResult>(() => ({
        updatedRooms: room ? [room] : [],
        deletedRoomIds: [],
      })),
    },
    runtimeRegistry: {
      cleanupGameManagerForRoom: vi.fn<(roomId: string) => void>(),
      // 明示退室ではBot置換を行わないことを検証するため参照ポートも渡す
      getGameManagerByPlayerId: vi.fn<
        (playerId: string) => RoomScopedGamePort | undefined
      >(() => createRoomScopedGamePortStub()),
    },
    sessionReservations,
    identityRegistry,
    output: createOutputStub(),
    leaveRoomChannel: vi.fn<(roomId: string) => Promise<void>>(() =>
      Promise.resolve(),
    ),
  };
};

describe("handleLeaveRoomEvent", () => {
  it("ルーム名簿から退出させること", async () => {
    const deps = createLeaveRoomDeps({ room: createRoom() });

    await handleLeaveRoomEvent(deps);

    expect(deps.roomManager.removePlayer).toHaveBeenCalledWith("player-1");
  });

  it("退室後のルーム状態を全員へ配信すること", async () => {
    const room = createRoom();
    const deps = createLeaveRoomDeps({ room });

    await handleLeaveRoomEvent(deps);

    expect(deps.output.publishRoomUpdateToRoom).toHaveBeenCalledWith(
      "room-1",
      room,
    );
  });

  it("明示退室ではBot置換を行わないこと", async () => {
    const deps = createLeaveRoomDeps({ room: createRoom() });

    await handleLeaveRoomEvent(deps);

    expect(deps.runtimeRegistry.getGameManagerByPlayerId).not.toHaveBeenCalled();
  });

  it("ルーム配信チャンネルから退出させること", async () => {
    const deps = createLeaveRoomDeps({ room: createRoom() });

    await handleLeaveRoomEvent(deps);

    expect(deps.leaveRoomChannel).toHaveBeenCalledWith("room-1");
  });

  it("復帰予約を破棄すること", async () => {
    const deps = createLeaveRoomDeps({
      room: createRoom(),
      reservedToken: "token-1",
    });

    await handleLeaveRoomEvent({ ...deps, sessionToken: "token-1" });

    expect(deps.sessionReservations.consume("token-1")).toBeUndefined();
  });

  it("識別子の対応を解放すること", async () => {
    const deps = createLeaveRoomDeps({ room: createRoom() });

    await handleLeaveRoomEvent(deps);

    expect(deps.identityRegistry.resolvePlayerId("socket-2")).toBe("socket-2");
  });

  it("トークン未提示でも識別子の対応を解放すること", async () => {
    const deps = createLeaveRoomDeps({ room: createRoom() });

    await handleLeaveRoomEvent({ ...deps, sessionToken: undefined });

    expect(deps.identityRegistry.getSocketId("player-1")).toBeUndefined();
  });

  it("所属ルームを引けない場合は配信チャンネルからの退出を行わないこと", async () => {
    const deps = createLeaveRoomDeps();

    await handleLeaveRoomEvent(deps);

    expect(deps.leaveRoomChannel).not.toHaveBeenCalled();
  });

  it("所属ルームを引けない場合は ignored_missing_room を記録すること", async () => {
    const deps = createLeaveRoomDeps();

    await handleLeaveRoomEvent(deps);

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.ROOM_USE_CASE}]`, {
      event: roomUseCaseLogEvents.LEAVE_ROOM,
      result: logResults.IGNORED_MISSING_ROOM,
      socketId: "player-1",
    });
  });

  it("退室が完了した場合は processed を記録すること", async () => {
    const deps = createLeaveRoomDeps({ room: createRoom() });

    await handleLeaveRoomEvent(deps);

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.ROOM_USE_CASE}]`, {
      event: roomUseCaseLogEvents.LEAVE_ROOM,
      result: logResults.PROCESSED,
      socketId: "player-1",
      roomId: "room-1",
    });
  });

  it("所属ルームを引けない場合でも識別子の対応を解放すること", async () => {
    const deps = createLeaveRoomDeps();

    await handleLeaveRoomEvent(deps);

    expect(deps.identityRegistry.resolvePlayerId("socket-2")).toBe("socket-2");
  });
});
