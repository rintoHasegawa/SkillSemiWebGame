/**
 * bombSyncService.test
 * 爆弾のAOI同期送信の現行挙動を固定する characterization test
 * 可視集合差分・設置者除外・AOI外スキップの分岐を検証する
 */
import { contracts as protocol, type domain } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import type { ActiveBombSnapshot } from "@server/domains/game/application/ports/gameUseCasePorts";
import type { RoomScopedGamePort } from "@server/domains/room/application/ports/roomUseCasePorts";
import { createRealtimeRoomSyncStateStore } from "@server/network/adapters/realtimeRoomSyncState";
import type { ReliableEmitters } from "../../CommonHandler";
import type { RuntimeResolverDeps } from "../runtime/gameRuntimeResolvers";
import { createBombSyncService } from "./bombSyncService";

type EmitCall = {
  socketId: string;
  event: string;
  payload: unknown;
};

/** 送信内容を記録するエミッタスタブを生成する */
const createReliableStub = () => {
  const calls: EmitCall[] = [];
  const noop = () => {};
  const reliable = {
    emitToAll: noop,
    emitToRoom: noop,
    emitToRoomExceptSocket: noop,
    emitToSocket: noop,
    emitToSocketById: (socketId: string, event: string, payload: unknown) => {
      calls.push({ socketId, event, payload });
    },
  } as unknown as ReliableEmitters;

  return { reliable, calls };
};

/** テスト用のプレイヤーデータを生成する */
const createPlayer = (
  id: string,
  overrides: Partial<domain.game.player.PlayerData> = {},
): domain.game.player.PlayerData => {
  return { id, name: `name-${id}`, x: 0, y: 0, teamId: 0, ...overrides };
};

/** テスト用の爆弾スナップショットを生成する */
const createBomb = (
  overrides: Partial<ActiveBombSnapshot> = {},
): ActiveBombSnapshot => {
  return {
    bombId: "bomb-1",
    ownerPlayerId: "socket-2",
    ownerTeamId: 1,
    x: 0,
    y: 0,
    explodeAtElapsedMs: 5000,
    ...overrides,
  };
};

/** ルーム参加者とランタイムプレイヤーを固定した依存スタブを生成する */
const createRuntimeDeps = (
  memberIds: string[],
  players: domain.game.player.PlayerData[],
): RuntimeResolverDeps => {
  const gameManager = {
    getRoomPlayers: () => players,
    getActiveBombSnapshots: () => [],
  } as unknown as RoomScopedGamePort;

  return {
    roomManager: {
      getRoomById: () => ({
        roomId: "room-1",
        ownerId: memberIds[0] ?? "socket-1",
        players: memberIds.map((id) => ({
          id,
          name: `name-${id}`,
          isOwner: false,
          isReady: false,
          preferredTeamId: null,
        })),
        status: "playing" as const,
        maxPlayers: 8,
        fieldSizePreset: "MEDIUM" as const,
        teamAssignmentMode: "random" as const,
      }),
    },
    runtimeRegistry: {
      getGameManagerByRoomId: () => gameManager,
    },
  };
};

/** テスト対象サービスと周辺スタブをまとめて生成する */
const setupService = (params: {
  memberIds?: string[];
  players?: domain.game.player.PlayerData[];
} = {}) => {
  const { reliable, calls } = createReliableStub();
  const realtimeRoomSyncState = createRealtimeRoomSyncStateStore();
  const updateViewerAoiCellCache = vi.fn();
  const service = createBombSyncService({
    reliable,
    runtimeDeps: createRuntimeDeps(
      params.memberIds ?? ["socket-1"],
      params.players ?? [createPlayer("socket-1")],
    ),
    realtimeRoomSyncState,
    updateViewerAoiCellCache,
  });

  return { service, calls, realtimeRoomSyncState, updateViewerAoiCellCache };
};

describe("createBombSyncService.syncVisibleBombsByViewer", () => {
  it("AOI内の未送信爆弾を受信者へ送信すること", () => {
    const { service, calls } = setupService();

    service.syncVisibleBombsByViewer("room-1", "socket-1", createPlayer("socket-1"), [
      createBomb(),
    ]);

    expect(calls).toEqual([
      {
        socketId: "socket-1",
        event: protocol.SocketEvents.BOMB_PLACED,
        payload: {
          bombId: "bomb-1",
          ownerTeamId: 1,
          x: 0,
          y: 0,
          explodeAtElapsedMs: 5000,
        },
      },
    ]);
  });

  it("爆弾が空の場合は送信しないこと", () => {
    const { service, calls } = setupService();

    service.syncVisibleBombsByViewer(
      "room-1",
      "socket-1",
      createPlayer("socket-1"),
      [],
    );

    expect(calls).toHaveLength(0);
  });

  it("AOI外の爆弾は送信しないこと", () => {
    const { service, calls } = setupService();

    service.syncVisibleBombsByViewer(
      "room-1",
      "socket-1",
      createPlayer("socket-1"),
      [createBomb({ x: 100, y: 100 })],
    );

    expect(calls).toHaveLength(0);
  });

  it("AOI外の爆弾は可視集合へ含めないこと", () => {
    const { service, realtimeRoomSyncState } = setupService();

    service.syncVisibleBombsByViewer(
      "room-1",
      "socket-1",
      createPlayer("socket-1"),
      [createBomb({ x: 100, y: 100 })],
    );

    expect(
      realtimeRoomSyncState.getVisibleBombIdsSnapshot("room-1", "socket-1").size,
    ).toBe(0);
  });

  it("送信済み爆弾を可視集合へ記録すること", () => {
    const { service, realtimeRoomSyncState } = setupService();

    service.syncVisibleBombsByViewer(
      "room-1",
      "socket-1",
      createPlayer("socket-1"),
      [createBomb()],
    );

    expect([
      ...realtimeRoomSyncState.getVisibleBombIdsSnapshot("room-1", "socket-1"),
    ]).toEqual(["bomb-1"]);
  });

  it("同じ爆弾を2回同期しても送信は1回のみとすること", () => {
    const { service, calls } = setupService();
    const viewer = createPlayer("socket-1");

    service.syncVisibleBombsByViewer("room-1", "socket-1", viewer, [
      createBomb(),
    ]);
    service.syncVisibleBombsByViewer("room-1", "socket-1", viewer, [
      createBomb(),
    ]);

    expect(calls).toHaveLength(1);
  });

  it("AOI外へ出た後に再度AOI内へ入った爆弾は再送信すること", () => {
    const { service, calls } = setupService();
    const viewer = createPlayer("socket-1");

    service.syncVisibleBombsByViewer("room-1", "socket-1", viewer, [
      createBomb(),
    ]);
    service.syncVisibleBombsByViewer("room-1", "socket-1", viewer, [
      createBomb({ x: 100, y: 100 }),
    ]);
    service.syncVisibleBombsByViewer("room-1", "socket-1", viewer, [
      createBomb(),
    ]);

    expect(calls).toHaveLength(2);
  });

  it("設置者本人には自分の爆弾を送信しないこと", () => {
    const { service, calls } = setupService();

    service.syncVisibleBombsByViewer(
      "room-1",
      "socket-1",
      createPlayer("socket-1"),
      [createBomb({ ownerPlayerId: "socket-1" })],
    );

    expect(calls).toHaveLength(0);
  });

  it("設置者本人の爆弾も可視集合へ記録すること", () => {
    const { service, realtimeRoomSyncState } = setupService();

    service.syncVisibleBombsByViewer(
      "room-1",
      "socket-1",
      createPlayer("socket-1"),
      [createBomb({ ownerPlayerId: "socket-1" })],
    );

    expect([
      ...realtimeRoomSyncState.getVisibleBombIdsSnapshot("room-1", "socket-1"),
    ]).toEqual(["bomb-1"]);
  });

  it("設置者がBotで受信者IDが同一の場合は送信すること", () => {
    const { service, calls } = setupService();

    service.syncVisibleBombsByViewer(
      "room-1",
      "bot:room-1:1",
      createPlayer("bot:room-1:1"),
      [createBomb({ ownerPlayerId: "bot:room-1:1" })],
    );

    expect(calls).toHaveLength(1);
  });

  it("複数のAOI内爆弾をすべて送信すること", () => {
    const { service, calls } = setupService();

    service.syncVisibleBombsByViewer(
      "room-1",
      "socket-1",
      createPlayer("socket-1"),
      [createBomb({ bombId: "bomb-1" }), createBomb({ bombId: "bomb-2" })],
    );

    expect(calls.map((call) => call.payload)).toEqual([
      expect.objectContaining({ bombId: "bomb-1" }),
      expect.objectContaining({ bombId: "bomb-2" }),
    ]);
  });

  it("送信ペイロードに設置者IDを含めないこと", () => {
    const { service, calls } = setupService();

    service.syncVisibleBombsByViewer(
      "room-1",
      "socket-1",
      createPlayer("socket-1"),
      [createBomb()],
    );

    expect(calls[0]?.payload).not.toHaveProperty("ownerPlayerId");
  });

  it("受信者のAOIセルキャッシュを更新すること", () => {
    const { service, updateViewerAoiCellCache } = setupService();
    const viewer = createPlayer("socket-1");

    service.syncVisibleBombsByViewer("room-1", "socket-1", viewer, []);

    expect(updateViewerAoiCellCache).toHaveBeenCalledWith(
      "room-1",
      "socket-1",
      viewer,
    );
  });

  it("受信者が移動してAOI範囲が変わると可視集合も更新されること", () => {
    const { service, realtimeRoomSyncState } = setupService();

    service.syncVisibleBombsByViewer(
      "room-1",
      "socket-1",
      createPlayer("socket-1"),
      [createBomb()],
    );
    service.syncVisibleBombsByViewer(
      "room-1",
      "socket-1",
      createPlayer("socket-1", { x: 100, y: 100 }),
      [createBomb()],
    );

    expect(
      realtimeRoomSyncState.getVisibleBombIdsSnapshot("room-1", "socket-1").size,
    ).toBe(0);
  });

  it("受信者ごとに可視集合を分離すること", () => {
    const { service, calls } = setupService();

    service.syncVisibleBombsByViewer(
      "room-1",
      "socket-1",
      createPlayer("socket-1"),
      [createBomb({ ownerPlayerId: "socket-9" })],
    );
    service.syncVisibleBombsByViewer(
      "room-1",
      "socket-2",
      createPlayer("socket-2"),
      [createBomb({ ownerPlayerId: "socket-9" })],
    );

    expect(calls.map((call) => call.socketId)).toEqual([
      "socket-1",
      "socket-2",
    ]);
  });
});

describe("createBombSyncService.publishBombPlacedToOthersInRoom", () => {
  /** テスト用の設置通知ペイロードを生成する */
  const createPayload = (overrides: Record<string, number | string> = {}) => {
    return {
      bombId: "bomb-1",
      ownerTeamId: 2,
      x: 0,
      y: 0,
      explodeAtElapsedMs: 4000,
      ...overrides,
    };
  };

  it("AOI内の他受信者へ設置通知を送信すること", () => {
    const { service, calls } = setupService({
      memberIds: ["socket-1", "socket-2"],
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishBombPlacedToOthersInRoom(
      "room-1",
      "socket-1",
      createPayload(),
    );

    expect(calls).toEqual([
      {
        socketId: "socket-2",
        event: protocol.SocketEvents.BOMB_PLACED,
        payload: createPayload(),
      },
    ]);
  });

  it("除外ソケットへは送信しないこと", () => {
    const { service, calls } = setupService({
      memberIds: ["socket-1"],
      players: [createPlayer("socket-1")],
    });

    service.publishBombPlacedToOthersInRoom(
      "room-1",
      "socket-1",
      createPayload(),
    );

    expect(calls).toHaveLength(0);
  });

  it("AOI外の受信者へは送信しないこと", () => {
    const { service, calls } = setupService({
      memberIds: ["socket-2"],
      players: [createPlayer("socket-2", { x: 100, y: 100 })],
    });

    service.publishBombPlacedToOthersInRoom(
      "room-1",
      "socket-1",
      createPayload(),
    );

    expect(calls).toHaveLength(0);
  });

  it("ルームにプレイヤーがいない場合は送信しないこと", () => {
    const { service, calls } = setupService({
      memberIds: ["socket-2"],
      players: [],
    });

    service.publishBombPlacedToOthersInRoom(
      "room-1",
      "socket-1",
      createPayload(),
    );

    expect(calls).toHaveLength(0);
  });

  it("Botのみのルームでは受信者が解決されず送信しないこと", () => {
    const { service, calls } = setupService({
      memberIds: ["bot:room-1:1"],
      players: [createPlayer("bot:room-1:1")],
    });

    service.publishBombPlacedToOthersInRoom(
      "room-1",
      "bot:room-1:1",
      createPayload(),
    );

    expect(calls).toHaveLength(0);
  });

  it("除外ソケットがBotの場合は人間の受信者へ送信すること", () => {
    const { service, calls } = setupService({
      memberIds: ["socket-1", "bot:room-1:1"],
      players: [createPlayer("socket-1"), createPlayer("bot:room-1:1")],
    });

    service.publishBombPlacedToOthersInRoom(
      "room-1",
      "bot:room-1:1",
      createPayload(),
    );

    expect(calls.map((call) => call.socketId)).toEqual(["socket-1"]);
  });

  it("送信対象の受信者ごとにAOIセルキャッシュを更新すること", () => {
    const { service, updateViewerAoiCellCache } = setupService({
      memberIds: ["socket-1", "socket-2"],
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishBombPlacedToOthersInRoom(
      "room-1",
      "socket-1",
      createPayload(),
    );

    expect(updateViewerAoiCellCache).toHaveBeenCalledTimes(1);
  });

  it("複数の受信者へ同一ペイロードを送信すること", () => {
    const { service, calls } = setupService({
      memberIds: ["socket-1", "socket-2", "socket-3"],
      players: [
        createPlayer("socket-1"),
        createPlayer("socket-2"),
        createPlayer("socket-3"),
      ],
    });

    service.publishBombPlacedToOthersInRoom(
      "room-1",
      "socket-1",
      createPayload(),
    );

    expect(calls.map((call) => call.socketId)).toEqual([
      "socket-2",
      "socket-3",
    ]);
  });

  it("設置通知の送信では可視集合を更新しないこと", () => {
    const { service, realtimeRoomSyncState } = setupService({
      memberIds: ["socket-1", "socket-2"],
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishBombPlacedToOthersInRoom(
      "room-1",
      "socket-1",
      createPayload(),
    );

    expect(
      realtimeRoomSyncState.getVisibleBombIdsSnapshot("room-1", "socket-2").size,
    ).toBe(0);
  });
});
