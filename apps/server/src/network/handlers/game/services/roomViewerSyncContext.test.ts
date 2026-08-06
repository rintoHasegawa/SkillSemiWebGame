/**
 * roomViewerSyncContext.test
 * ルーム受信者走査の現行挙動を固定する characterization test
 * プレイヤー不在・受信者未解決・Bot除外の分岐と走査順序を検証する
 */
import type { domain } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import type { RoomScopedGamePort } from "@server/domains/room/application/ports/roomUseCasePorts";
import type { RuntimeResolverDeps } from "../runtime/gameRuntimeResolvers";
import { forEachRoomViewer } from "./roomViewerSyncContext";

/** テスト用のルームメンバーを生成する */
const createMember = (id: string): domain.room.RoomMember => {
  return {
    id,
    name: `name-${id}`,
    isOwner: false,
    isReady: false,
    preferredTeamId: null,
  };
};

/** テスト用のプレイヤーデータを生成する */
const createPlayer = (
  id: string,
  overrides: Partial<domain.game.player.PlayerData> = {},
): domain.game.player.PlayerData => {
  return { id, name: `name-${id}`, x: 0, y: 0, teamId: 0, ...overrides };
};

/** ルーム参加者とランタイムプレイヤーを固定した依存スタブを生成する */
const createDeps = (params: {
  memberIds: string[];
  players: domain.game.player.PlayerData[];
  hasGameManager?: boolean;
}): RuntimeResolverDeps => {
  const gameManager = {
    getRoomPlayers: vi.fn(() => params.players),
    getActiveBombSnapshots: vi.fn(() => []),
  } as unknown as RoomScopedGamePort;

  return {
    roomManager: {
      getRoomById: vi.fn(() => ({
        roomId: "room-1",
        ownerId: params.memberIds[0] ?? "socket-1",
        players: params.memberIds.map(createMember),
        status: "playing" as const,
        maxPlayers: 8,
        fieldSizePreset: "MEDIUM" as const,
        teamAssignmentMode: "random" as const,
      })),
    },
    runtimeRegistry: {
      getGameManagerByRoomId: vi.fn(() =>
        params.hasGameManager === false ? undefined : gameManager,
      ),
    },
  };
};

describe("forEachRoomViewer", () => {
  it("ルームにプレイヤーがいない場合は処理を実行しないこと", () => {
    const run = vi.fn();
    const runtimeDeps = createDeps({ memberIds: ["socket-1"], players: [] });

    forEachRoomViewer({ runtimeDeps, roomId: "room-1", run });

    expect(run).not.toHaveBeenCalled();
  });

  it("ランタイムが解決できない場合は処理を実行しないこと", () => {
    const run = vi.fn();
    const runtimeDeps = createDeps({
      memberIds: ["socket-1"],
      players: [createPlayer("socket-1")],
      hasGameManager: false,
    });

    forEachRoomViewer({ runtimeDeps, roomId: "room-1", run });

    expect(run).not.toHaveBeenCalled();
  });

  it("プレイヤーがいない場合は受信者一覧を参照しないこと", () => {
    const runtimeDeps = createDeps({ memberIds: ["socket-1"], players: [] });

    forEachRoomViewer({ runtimeDeps, roomId: "room-1", run: vi.fn() });

    expect(runtimeDeps.roomManager.getRoomById).not.toHaveBeenCalled();
  });

  it("受信者ごとに1回ずつ処理を実行すること", () => {
    const run = vi.fn();
    const runtimeDeps = createDeps({
      memberIds: ["socket-1", "socket-2"],
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    forEachRoomViewer({ runtimeDeps, roomId: "room-1", run });

    expect(run).toHaveBeenCalledTimes(2);
  });

  it("受信者本人のプレイヤーデータを渡すこと", () => {
    const run = vi.fn();
    const viewer = createPlayer("socket-1", { x: 5, y: 6 });
    const runtimeDeps = createDeps({
      memberIds: ["socket-1"],
      players: [viewer, createPlayer("socket-2")],
    });

    forEachRoomViewer({ runtimeDeps, roomId: "room-1", run });

    expect(run).toHaveBeenCalledWith({
      viewerId: "socket-1",
      viewer,
      roomPlayers: [viewer, createPlayer("socket-2")],
    });
  });

  it("ルーム全プレイヤー一覧を各受信者へ渡すこと", () => {
    const players = [createPlayer("socket-1"), createPlayer("bot:room-1:1")];
    const run = vi.fn();
    const runtimeDeps = createDeps({ memberIds: ["socket-1"], players });

    forEachRoomViewer({ runtimeDeps, roomId: "room-1", run });

    expect(run.mock.calls[0]?.[0].roomPlayers).toBe(players);
  });

  it("ルーム参加者一覧の順序で受信者を走査すること", () => {
    const viewerIds: string[] = [];
    const runtimeDeps = createDeps({
      memberIds: ["socket-2", "socket-1"],
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    forEachRoomViewer({
      runtimeDeps,
      roomId: "room-1",
      run: ({ viewerId }) => {
        viewerIds.push(viewerId);
      },
    });

    expect(viewerIds).toEqual(["socket-2", "socket-1"]);
  });

  it("Botは受信者として走査しないこと", () => {
    const viewerIds: string[] = [];
    const runtimeDeps = createDeps({
      memberIds: ["socket-1", "bot:room-1:1"],
      players: [createPlayer("socket-1"), createPlayer("bot:room-1:1")],
    });

    forEachRoomViewer({
      runtimeDeps,
      roomId: "room-1",
      run: ({ viewerId }) => {
        viewerIds.push(viewerId);
      },
    });

    expect(viewerIds).toEqual(["socket-1"]);
  });

  it("ランタイムにプレイヤーが存在しない受信者はスキップすること", () => {
    const viewerIds: string[] = [];
    const runtimeDeps = createDeps({
      memberIds: ["socket-1", "socket-2"],
      players: [createPlayer("socket-1")],
    });

    forEachRoomViewer({
      runtimeDeps,
      roomId: "room-1",
      run: ({ viewerId }) => {
        viewerIds.push(viewerId);
      },
    });

    expect(viewerIds).toEqual(["socket-1"]);
  });

  it("ルームが解決できない場合は処理を実行しないこと", () => {
    const run = vi.fn();
    const runtimeDeps: RuntimeResolverDeps = {
      roomManager: { getRoomById: vi.fn(() => undefined) },
      runtimeRegistry: {
        getGameManagerByRoomId: vi.fn(
          () =>
            ({
              getRoomPlayers: () => [createPlayer("socket-1")],
              getActiveBombSnapshots: () => [],
            }) as unknown as RoomScopedGamePort,
        ),
      },
    };

    forEachRoomViewer({ runtimeDeps, roomId: "room-1", run });

    expect(run).not.toHaveBeenCalled();
  });

  it("同一IDのプレイヤーが重複する場合は後勝ちで解決すること", () => {
    const duplicated = createPlayer("socket-1", { x: 9, y: 9 });
    const run = vi.fn();
    const runtimeDeps = createDeps({
      memberIds: ["socket-1"],
      players: [createPlayer("socket-1", { x: 1, y: 1 }), duplicated],
    });

    forEachRoomViewer({ runtimeDeps, roomId: "room-1", run });

    expect(run.mock.calls[0]?.[0].viewer).toBe(duplicated);
  });

  it("指定したルームIDでプレイヤーと受信者を解決すること", () => {
    const runtimeDeps = createDeps({
      memberIds: ["socket-1"],
      players: [createPlayer("socket-1")],
    });

    forEachRoomViewer({ runtimeDeps, roomId: "room-9", run: vi.fn() });

    expect(
      runtimeDeps.runtimeRegistry.getGameManagerByRoomId,
    ).toHaveBeenCalledWith("room-9");
  });
});
