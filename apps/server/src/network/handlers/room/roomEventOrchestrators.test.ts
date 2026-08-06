/**
 * roomEventOrchestrators.test
 * ルーム受信イベント調停の現行挙動を固定する characterization test
 * ロビー設定更新の差分スキップ・チーム選択の全status分岐・参加結果ごとのログを検証する
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

/** テスト用のルーム状態を生成する */
const createRoom = ({
  targetPlayerCount = 4,
  fieldSizePreset = "MEDIUM",
  teamAssignmentMode = "random",
}: RoomParams = {}): domain.room.Room => {
  return {
    roomId: "room-1",
    ownerId: "socket-1",
    players: [
      {
        id: "socket-1",
        name: "name-1",
        isOwner: true,
        isReady: false,
        preferredTeamId: null,
      },
    ],
    status: domain.room.RoomPhase.WAITING,
    maxPlayers: 100,
    fieldSizePreset,
    targetPlayerCount,
    teamAssignmentMode,
  };
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

describe("handleLobbySettingsUpdateEvent", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("設定が変化した場合は更新後ルームを全員へ配信すること", () => {
    const room = createRoom();
    const updatedRoom = createRoom({ targetPlayerCount: 8 });
    const output = createOutputStub();

    handleLobbySettingsUpdateEvent(
      {
        socketId: "socket-1",
        roomManager: {
          getRoomByOwnerId: vi.fn(() => room),
          updateLobbySettings: vi.fn(() => updatedRoom),
        },
        output,
      },
      {
        targetPlayerCount: 8,
        fieldSizePreset: "MEDIUM",
        teamAssignmentMode: "random",
      },
    );

    expect(output.publishRoomUpdateToRoom).toHaveBeenCalledWith(
      "room-1",
      updatedRoom,
    );
  });

  it("受信した設定値でルーム更新を依頼すること", () => {
    const room = createRoom();
    const updateLobbySettings = vi.fn(() => createRoom());

    handleLobbySettingsUpdateEvent(
      {
        socketId: "socket-1",
        roomManager: {
          getRoomByOwnerId: vi.fn(() => room),
          updateLobbySettings,
        },
        output: createOutputStub(),
      },
      {
        targetPlayerCount: 8,
        fieldSizePreset: "LARGE",
        teamAssignmentMode: "player_select",
      },
    );

    expect(updateLobbySettings).toHaveBeenCalledWith(
      "room-1",
      8,
      "LARGE",
      "player_select",
    );
  });

  it("オーナーのルームが無い場合は更新しないこと", () => {
    const updateLobbySettings = vi.fn(() => createRoom());
    const output = createOutputStub();

    handleLobbySettingsUpdateEvent(
      {
        socketId: "socket-1",
        roomManager: {
          getRoomByOwnerId: vi.fn(() => undefined),
          updateLobbySettings,
        },
        output,
      },
      {
        targetPlayerCount: 8,
        fieldSizePreset: "LARGE",
        teamAssignmentMode: "random",
      },
    );

    expect(updateLobbySettings).not.toHaveBeenCalled();
    expect(output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("全設定値が現在値と同じ場合は更新も配信もしないこと", () => {
    const updateLobbySettings = vi.fn(() => createRoom());
    const output = createOutputStub();

    handleLobbySettingsUpdateEvent(
      {
        socketId: "socket-1",
        roomManager: {
          getRoomByOwnerId: vi.fn(() => createRoom()),
          updateLobbySettings,
        },
        output,
      },
      {
        targetPlayerCount: 4,
        fieldSizePreset: "MEDIUM",
        teamAssignmentMode: "random",
      },
    );

    expect(updateLobbySettings).not.toHaveBeenCalled();
    expect(output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("チーム割り当て方式だけが変化した場合も更新すること", () => {
    const updateLobbySettings = vi.fn(() => createRoom());

    handleLobbySettingsUpdateEvent(
      {
        socketId: "socket-1",
        roomManager: {
          getRoomByOwnerId: vi.fn(() => createRoom()),
          updateLobbySettings,
        },
        output: createOutputStub(),
      },
      {
        targetPlayerCount: 4,
        fieldSizePreset: "MEDIUM",
        teamAssignmentMode: "player_select",
      },
    );

    expect(updateLobbySettings).toHaveBeenCalled();
  });

  it("更新結果が取得できない場合は配信しないこと", () => {
    const output = createOutputStub();

    handleLobbySettingsUpdateEvent(
      {
        socketId: "socket-1",
        roomManager: {
          getRoomByOwnerId: vi.fn(() => createRoom()),
          updateLobbySettings: vi.fn(() => undefined),
        },
        output,
      },
      {
        targetPlayerCount: 8,
        fieldSizePreset: "MEDIUM",
        teamAssignmentMode: "random",
      },
    );

    expect(output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });
});

describe("handleSelectTeamEvent", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("選択が成立した場合は更新後ルームを全員へ配信すること", () => {
    const room = createRoom();
    const output = createOutputStub();
    const result: SelectTeamResult = { status: "ok", room };

    handleSelectTeamEvent(
      {
        socketId: "socket-1",
        roomManager: {
          getRoomByPlayerId: vi.fn(() => room),
          selectTeam: vi.fn(() => result),
        },
        output,
      },
      { preferredTeamId: 1 },
    );

    expect(output.publishRoomUpdateToRoom).toHaveBeenCalledWith("room-1", room);
  });

  it("受信した希望チームIDで選択処理を依頼すること", () => {
    const room = createRoom();
    const selectTeam = vi.fn<() => SelectTeamResult>(() => ({
      status: "ok",
      room,
    }));

    handleSelectTeamEvent(
      {
        socketId: "socket-1",
        roomManager: {
          getRoomByPlayerId: vi.fn(() => room),
          selectTeam,
        },
        output: createOutputStub(),
      },
      { preferredTeamId: 2 },
    );

    expect(selectTeam).toHaveBeenCalledWith("socket-1", 2);
  });

  it("チーム満員の場合は拒否通知を送ること", () => {
    const output = createOutputStub();

    handleSelectTeamEvent(
      {
        socketId: "socket-1",
        roomManager: {
          getRoomByPlayerId: vi.fn(() => createRoom()),
          selectTeam: vi.fn<() => SelectTeamResult>(() => ({
            status: "team_full",
            teamId: 3,
          })),
        },
        output,
      },
      { preferredTeamId: 3 },
    );

    expect(output.publishSelectTeamRejectedToSocket).toHaveBeenCalledWith(3);
  });

  it("チーム満員の場合はルーム更新を配信しないこと", () => {
    const output = createOutputStub();

    handleSelectTeamEvent(
      {
        socketId: "socket-1",
        roomManager: {
          getRoomByPlayerId: vi.fn(() => createRoom()),
          selectTeam: vi.fn<() => SelectTeamResult>(() => ({
            status: "team_full",
            teamId: 3,
          })),
        },
        output,
      },
      { preferredTeamId: 3 },
    );

    expect(output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("対象が見つからない場合は何も配信しないこと", () => {
    const output = createOutputStub();

    handleSelectTeamEvent(
      {
        socketId: "socket-1",
        roomManager: {
          getRoomByPlayerId: vi.fn(() => undefined),
          selectTeam: vi.fn<() => SelectTeamResult>(() => ({
            status: "not_found",
          })),
        },
        output,
      },
      { preferredTeamId: null },
    );

    expect(output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
    expect(output.publishSelectTeamRejectedToSocket).not.toHaveBeenCalled();
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
    joinRoom: vi.fn<(roomId: string) => Promise<void>>(() =>
      Promise.resolve(),
    ),
    room,
  };
};

const joinPayload: domain.room.JoinRoomPayload = {
  roomId: "room-1",
  playerName: "太郎",
};

describe("handleJoinRoomEvent", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

    expect(joinedDeps.runtimeRegistry.ensureGameManagerForRoom)
      .toHaveBeenCalledWith("room-1");
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
