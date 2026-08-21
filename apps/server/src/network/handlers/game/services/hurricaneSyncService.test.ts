/**
 * hurricaneSyncService.test
 * ハリケーンのAOI同期送信の挙動を固定するユニットテスト
 * 可視集合の変化判定・全量／差分イベントの切り替え・スナップショット管理を検証する
 * 生存集合から外れたハリケーンの同期解除と同期不要時のスキップも検証する
 */
import { contracts as protocol, type domain } from "@repo/shared";
import type { HurricaneStatePayload } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import type { RoomScopedGamePort } from "@server/domains/room/application/ports/roomUseCasePorts";
import { createRealtimeRoomSyncStateStore } from "@server/network/adapters/realtimeRoomSyncState";
import type { ReliableEmitters } from "../../CommonHandler";
import type { RuntimeResolverDeps } from "../runtime/gameRuntimeResolvers";
import { createHurricaneSyncService } from "./hurricaneSyncService";

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

/** テスト用のハリケーン状態を生成する */
const createHurricane = (
  overrides: Partial<HurricaneStatePayload> = {},
): HurricaneStatePayload => {
  return {
    id: "h1",
    x: 0,
    y: 0,
    radius: 1,
    rotationRad: 0,
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
  const service = createHurricaneSyncService({
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

describe("createHurricaneSyncService.publishCurrentHurricanesToRoom", () => {
  it("AOI内のハリケーンを全量イベントで送信すること", () => {
    const { service, calls } = setupService();
    const hurricane = createHurricane();

    service.publishCurrentHurricanesToRoom("room-1", [hurricane]);

    expect(calls).toEqual([
      {
        socketId: "socket-1",
        event: protocol.SocketEvents.CURRENT_HURRICANES,
        payload: [hurricane],
      },
    ]);
  });

  it("ハリケーンが空でも空配列を送信すること", () => {
    const { service, calls } = setupService();

    service.publishCurrentHurricanesToRoom("room-1", []);

    expect(calls[0]?.payload).toEqual([]);
  });

  it("AOI外のハリケーンを除外して送信すること", () => {
    const { service, calls } = setupService();

    service.publishCurrentHurricanesToRoom("room-1", [
      createHurricane({ id: "h1" }),
      createHurricane({ id: "h2", x: 100, y: 100 }),
    ]);

    expect(calls[0]?.payload).toEqual([createHurricane({ id: "h1" })]);
  });

  it("ルームにプレイヤーがいない場合は送信しないこと", () => {
    const { service, calls } = setupService({ players: [] });

    service.publishCurrentHurricanesToRoom("room-1", [createHurricane()]);

    expect(calls).toHaveLength(0);
  });

  it("可視ハリケーンIDを状態ストアへ記録すること", () => {
    const { service, realtimeRoomSyncState } = setupService();

    service.publishCurrentHurricanesToRoom("room-1", [createHurricane()]);

    expect([
      ...realtimeRoomSyncState.getVisibleHurricaneIdsSnapshot(
        "room-1",
        "socket-1",
      ),
    ]).toEqual(["h1"]);
  });

  it("受信者ごとに可視範囲で絞った内容を送信すること", () => {
    const { service, calls } = setupService({
      memberIds: ["socket-1", "socket-2"],
      players: [
        createPlayer("socket-1"),
        createPlayer("socket-2", { x: 100, y: 100 }),
      ],
    });

    service.publishCurrentHurricanesToRoom("room-1", [createHurricane()]);

    expect(calls.map((call) => call.payload)).toEqual([[createHurricane()], []]);
  });

  it("受信者ごとにAOIセルキャッシュを更新すること", () => {
    const { service, updateViewerAoiCellCache } = setupService({
      memberIds: ["socket-1", "socket-2"],
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishCurrentHurricanesToRoom("room-1", []);

    expect(updateViewerAoiCellCache).toHaveBeenCalledTimes(2);
  });

  it("ルームのスナップショットを置き換えること", () => {
    const { service, calls } = setupService();

    service.publishCurrentHurricanesToRoom("room-1", [
      createHurricane({ id: "h1" }),
      createHurricane({ id: "h2" }),
    ]);
    service.publishCurrentHurricanesToRoom("room-1", [
      createHurricane({ id: "h1" }),
    ]);
    service.publishUpdateHurricanesToRoom("room-1", [], ["h1"]);

    expect(calls).toHaveLength(2);
  });
});

describe("createHurricaneSyncService.publishUpdateHurricanesToRoom", () => {
  it("可視集合が変化した場合は全量イベントを送信すること", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom("room-1", [createHurricane()], ["h1"]);

    expect(calls[0]).toEqual({
      socketId: "socket-1",
      event: protocol.SocketEvents.CURRENT_HURRICANES,
      payload: [createHurricane()],
    });
  });

  it("可視集合が同一の場合は差分イベントを送信すること", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom("room-1", [createHurricane()], ["h1"]);
    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ x: 1, y: 1 })],
      ["h1"],
    );

    expect(calls[1]).toEqual({
      socketId: "socket-1",
      event: protocol.SocketEvents.UPDATE_HURRICANES,
      payload: [createHurricane({ x: 1, y: 1 })],
    });
  });

  it("可視集合が同一で差分対象が無い場合は送信しないこと", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom("room-1", [createHurricane()], ["h1"]);
    service.publishUpdateHurricanesToRoom("room-1", [], ["h1"]);

    expect(calls).toHaveLength(1);
  });

  it("初回に空配列を渡した場合は送信しないこと", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom("room-1", [], []);

    expect(calls).toHaveLength(0);
  });

  it("同期対象もスナップショットも無い場合は受信者走査を行わないこと", () => {
    const { service, updateViewerAoiCellCache } = setupService();

    service.publishUpdateHurricanesToRoom("room-1", [], []);

    expect(updateViewerAoiCellCache).not.toHaveBeenCalled();
  });

  it("AOI外へ移動したハリケーンは全量イベントで除外されること", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom("room-1", [createHurricane()], ["h1"]);
    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ x: 100, y: 100 })],
      ["h1"],
    );

    expect(calls[1]).toEqual({
      socketId: "socket-1",
      event: protocol.SocketEvents.CURRENT_HURRICANES,
      payload: [],
    });
  });

  it("AOI外のハリケーンのみの更新は送信しないこと", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ x: 100, y: 100 })],
      ["h1"],
    );

    expect(calls).toHaveLength(0);
  });

  it("ハリケーンが追加された場合は全量イベントを送信すること", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h1" })],
      ["h1"],
    );
    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h2" })],
      ["h1", "h2"],
    );

    expect(calls[1]).toEqual({
      socketId: "socket-1",
      event: protocol.SocketEvents.CURRENT_HURRICANES,
      payload: [createHurricane({ id: "h1" }), createHurricane({ id: "h2" })],
    });
  });

  it("スナップショットへ蓄積したハリケーンは更新対象外でも可視集合へ残ること", () => {
    const { service, realtimeRoomSyncState } = setupService();

    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h1" })],
      ["h1"],
    );
    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h2" })],
      ["h1", "h2"],
    );

    expect([
      ...realtimeRoomSyncState.getVisibleHurricaneIdsSnapshot(
        "room-1",
        "socket-1",
      ),
    ]).toEqual(["h1", "h2"]);
  });

  it("生存集合から外れたハリケーンを全量イベントで同期解除すること", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h1" })],
      ["h1"],
    );
    service.publishUpdateHurricanesToRoom("room-1", [], []);

    expect(calls[1]).toEqual({
      socketId: "socket-1",
      event: protocol.SocketEvents.CURRENT_HURRICANES,
      payload: [],
    });
  });

  it("生存集合から外れたハリケーンを可視集合からも除くこと", () => {
    const { service, realtimeRoomSyncState } = setupService();

    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h1" })],
      ["h1"],
    );
    service.publishUpdateHurricanesToRoom("room-1", [], []);

    expect([
      ...realtimeRoomSyncState.getVisibleHurricaneIdsSnapshot(
        "room-1",
        "socket-1",
      ),
    ]).toEqual([]);
  });

  it("生存しているハリケーンのみを残した全量イベントを送信すること", () => {
    const { service, calls } = setupService();

    service.publishCurrentHurricanesToRoom("room-1", [
      createHurricane({ id: "h1" }),
      createHurricane({ id: "h2" }),
    ]);
    service.publishUpdateHurricanesToRoom("room-1", [], ["h1"]);

    expect(calls[1]).toEqual({
      socketId: "socket-1",
      event: protocol.SocketEvents.CURRENT_HURRICANES,
      payload: [createHurricane({ id: "h1" })],
    });
  });

  it("生存集合に無いハリケーンの差分はスナップショットへ取り込まないこと", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h1" })],
      ["h1"],
    );
    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h1", x: 1 })],
      [],
    );

    expect(calls[1]?.payload).toEqual([]);
  });

  it("生存集合が空になった後の空更新を繰り返し送信しないこと", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h1" })],
      ["h1"],
    );
    service.publishUpdateHurricanesToRoom("room-1", [], []);
    service.publishUpdateHurricanesToRoom("room-1", [], []);

    expect(calls).toHaveLength(2);
  });

  it("差分イベントには更新対象のハリケーンのみ含めること", () => {
    const { service, calls } = setupService();

    service.publishCurrentHurricanesToRoom("room-1", [
      createHurricane({ id: "h1" }),
      createHurricane({ id: "h2" }),
    ]);
    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h2", x: 1 })],
      ["h1", "h2"],
    );

    expect(calls[1]?.payload).toEqual([createHurricane({ id: "h2", x: 1 })]);
  });

  it("ルームにプレイヤーがいない場合は送信しないこと", () => {
    const { service, calls } = setupService({ players: [] });

    service.publishUpdateHurricanesToRoom("room-1", [createHurricane()], ["h1"]);

    expect(calls).toHaveLength(0);
  });

  it("受信者ごとに可視判定を行うこと", () => {
    const { service, calls } = setupService({
      memberIds: ["socket-1", "socket-2"],
      players: [
        createPlayer("socket-1"),
        createPlayer("socket-2", { x: 100, y: 100 }),
      ],
    });

    service.publishUpdateHurricanesToRoom("room-1", [createHurricane()], ["h1"]);

    expect(calls.map((call) => call.socketId)).toEqual(["socket-1"]);
  });

  it("受信者ごとにAOIセルキャッシュを更新すること", () => {
    const { service, updateViewerAoiCellCache } = setupService({
      memberIds: ["socket-1", "socket-2"],
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishUpdateHurricanesToRoom("room-1", [createHurricane()], ["h1"]);

    expect(updateViewerAoiCellCache).toHaveBeenCalledTimes(2);
  });

  it("ルームごとにスナップショットを分離すること", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h1" })],
      ["h1"],
    );
    service.publishUpdateHurricanesToRoom(
      "room-2",
      [createHurricane({ id: "h2" })],
      ["h2"],
    );

    expect(calls[1]?.payload).toEqual([createHurricane({ id: "h2" })]);
  });

  it("ルームごとに生存集合を分離して適用すること", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h1" })],
      ["h1"],
    );
    service.publishUpdateHurricanesToRoom(
      "room-2",
      [createHurricane({ id: "h2" })],
      ["h2"],
    );
    service.publishUpdateHurricanesToRoom("room-1", [], ["h1"]);

    expect(calls).toHaveLength(2);
  });
});

describe("createHurricaneSyncService.clearRoomSnapshot", () => {
  it("破棄後の更新では以前のハリケーンを含めないこと", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h1" })],
      ["h1"],
    );
    service.clearRoomSnapshot("room-1");
    service.publishUpdateHurricanesToRoom(
      "room-1",
      [createHurricane({ id: "h2" })],
      ["h2"],
    );

    expect(calls[1]?.payload).toEqual([createHurricane({ id: "h2" })]);
  });

  it("破棄後に生存0の空更新が来ても送信しないこと", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom("room-1", [createHurricane()], ["h1"]);
    service.clearRoomSnapshot("room-1");
    service.publishUpdateHurricanesToRoom("room-1", [], []);

    expect(calls).toHaveLength(1);
  });

  it("他ルームのスナップショットへ影響しないこと", () => {
    const { service, calls } = setupService();

    service.publishUpdateHurricanesToRoom(
      "room-2",
      [createHurricane({ id: "h1" })],
      ["h1"],
    );
    service.clearRoomSnapshot("room-1");
    service.publishUpdateHurricanesToRoom(
      "room-2",
      [createHurricane({ id: "h1", x: 1 })],
      ["h1"],
    );

    expect(calls[1]?.event).toBe(protocol.SocketEvents.UPDATE_HURRICANES);
  });

  it("未登録ルームを破棄しても例外を投げないこと", () => {
    const { service } = setupService();

    expect(() => service.clearRoomSnapshot("unknown-room")).not.toThrow();
  });

  it("状態ストアの可視IDは破棄しないこと", () => {
    const { service, realtimeRoomSyncState } = setupService();

    service.publishUpdateHurricanesToRoom("room-1", [createHurricane()], ["h1"]);
    service.clearRoomSnapshot("room-1");

    expect([
      ...realtimeRoomSyncState.getVisibleHurricaneIdsSnapshot(
        "room-1",
        "socket-1",
      ),
    ]).toEqual(["h1"]);
  });
});
