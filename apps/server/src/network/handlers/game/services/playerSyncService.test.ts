/**
 * playerSyncService.test
 * プレイヤー差分同期の現行挙動を固定する characterization test
 * 可視プレイヤーの増減通知・自分自身の扱い・座標差分送信の分岐を検証する
 */
import { contracts as protocol, type domain } from "@repo/shared";
import type { UpdatePlayersPayload } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import type { ActiveBombSnapshot } from "@server/domains/game/application/ports/gameUseCasePorts";
import type { RoomScopedGamePort } from "@server/domains/room/application/ports/roomUseCasePorts";
import { createRealtimeRoomSyncStateStore } from "@server/network/adapters/realtimeRoomSyncState";
import type { ReliableEmitters } from "../../CommonHandler";
import type { RuntimeResolverDeps } from "../runtime/gameRuntimeResolvers";
import { createPlayerSyncService } from "./playerSyncService";

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

/** ルーム参加者とランタイムプレイヤーを固定した依存スタブを生成する */
const createRuntimeDeps = (
  memberIds: string[],
  players: domain.game.player.PlayerData[],
  bombs: ActiveBombSnapshot[],
): RuntimeResolverDeps => {
  const gameManager = {
    getRoomPlayers: () => players,
    getActiveBombSnapshots: () => bombs,
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
  bombs?: ActiveBombSnapshot[];
} = {}) => {
  const { reliable, calls } = createReliableStub();
  const realtimeRoomSyncState = createRealtimeRoomSyncStateStore();
  const updateViewerAoiCellCache = vi.fn();
  const syncVisibleBombsByViewer = vi.fn();
  const service = createPlayerSyncService({
    reliable,
    runtimeDeps: createRuntimeDeps(
      params.memberIds ?? ["socket-1"],
      params.players ?? [createPlayer("socket-1")],
      params.bombs ?? [],
    ),
    realtimeRoomSyncState,
    bombSyncService: { syncVisibleBombsByViewer },
    updateViewerAoiCellCache,
  });

  return {
    service,
    calls,
    realtimeRoomSyncState,
    updateViewerAoiCellCache,
    syncVisibleBombsByViewer,
  };
};

/** 指定イベントの送信のみ抽出する */
const filterEvent = (calls: EmitCall[], event: string): EmitCall[] => {
  return calls.filter((call) => call.event === event);
};

describe("createPlayerSyncService.publishUpdatePlayersToRoom", () => {
  it("初回同期では受信者自身へNEW_PLAYERを送信すること", () => {
    const { service, calls } = setupService();

    service.publishUpdatePlayersToRoom("room-1", []);

    expect(filterEvent(calls, protocol.SocketEvents.NEW_PLAYER)).toEqual([
      {
        socketId: "socket-1",
        event: protocol.SocketEvents.NEW_PLAYER,
        payload: createPlayer("socket-1"),
      },
    ]);
  });

  it("AOI内の他プレイヤーへNEW_PLAYERを送信すること", () => {
    const { service, calls } = setupService({
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishUpdatePlayersToRoom("room-1", []);

    expect(
      filterEvent(calls, protocol.SocketEvents.NEW_PLAYER).map(
        (call) => (call.payload as domain.game.player.PlayerData).id,
      ),
    ).toEqual(["socket-1", "socket-2"]);
  });

  it("AOI外の他プレイヤーはNEW_PLAYERの対象外とすること", () => {
    const { service, calls } = setupService({
      players: [
        createPlayer("socket-1"),
        createPlayer("socket-2", { x: 100, y: 100 }),
      ],
    });

    service.publishUpdatePlayersToRoom("room-1", []);

    expect(
      filterEvent(calls, protocol.SocketEvents.NEW_PLAYER).map(
        (call) => (call.payload as domain.game.player.PlayerData).id,
      ),
    ).toEqual(["socket-1"]);
  });

  it("2回目の同期では可視済みプレイヤーへNEW_PLAYERを再送しないこと", () => {
    const { service, calls } = setupService();

    service.publishUpdatePlayersToRoom("room-1", []);
    service.publishUpdatePlayersToRoom("room-1", []);

    expect(filterEvent(calls, protocol.SocketEvents.NEW_PLAYER)).toHaveLength(
      1,
    );
  });

  it("可視プレイヤーIDを状態ストアへ記録すること", () => {
    const { service, realtimeRoomSyncState } = setupService({
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishUpdatePlayersToRoom("room-1", []);

    expect([
      ...realtimeRoomSyncState.getVisiblePlayerIdsSnapshot("room-1", "socket-1"),
    ]).toEqual(["socket-1", "socket-2"]);
  });

  it("可視から外れたプレイヤーへREMOVE_PLAYERを送信すること", () => {
    const { service, calls, realtimeRoomSyncState } = setupService();
    realtimeRoomSyncState.replaceVisiblePlayerIds("room-1", "socket-1", [
      "socket-9",
    ]);

    service.publishUpdatePlayersToRoom("room-1", []);

    expect(filterEvent(calls, protocol.SocketEvents.REMOVE_PLAYER)).toEqual([
      {
        socketId: "socket-1",
        event: protocol.SocketEvents.REMOVE_PLAYER,
        payload: "socket-9",
      },
    ]);
  });

  it("可視から外れたプレイヤーの座標キャッシュを削除すること", () => {
    const { service, realtimeRoomSyncState } = setupService();
    realtimeRoomSyncState.replaceVisiblePlayerIds("room-1", "socket-1", [
      "socket-9",
    ]);
    realtimeRoomSyncState
      .getPlayerPositionCache("room-1", "socket-1")
      .set("socket-9", { x: 1, y: 1 });

    service.publishUpdatePlayersToRoom("room-1", []);

    expect(
      realtimeRoomSyncState
        .getPlayerPositionCache("room-1", "socket-1")
        .has("socket-9"),
    ).toBe(false);
  });

  it("可視のままのプレイヤーへはREMOVE_PLAYERを送信しないこと", () => {
    const { service, calls } = setupService({
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishUpdatePlayersToRoom("room-1", []);
    service.publishUpdatePlayersToRoom("room-1", []);

    expect(filterEvent(calls, protocol.SocketEvents.REMOVE_PLAYER)).toHaveLength(
      0,
    );
  });

  it("AOI内の他プレイヤーの座標差分をUPDATE_PLAYERSで送信すること", () => {
    const { service, calls } = setupService({
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });
    const players: UpdatePlayersPayload = [{ id: "socket-2", x: 1, y: 2 }];

    service.publishUpdatePlayersToRoom("room-1", players);

    expect(filterEvent(calls, protocol.SocketEvents.UPDATE_PLAYERS)).toEqual([
      {
        socketId: "socket-1",
        event: protocol.SocketEvents.UPDATE_PLAYERS,
        payload: [{ id: "socket-2", x: 1, y: 2 }],
      },
    ]);
  });

  it("UPDATE_PLAYERSの座標を量子化して送信すること", () => {
    const { service, calls } = setupService({
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 1.23456, y: 2.98765 },
    ]);

    expect(filterEvent(calls, protocol.SocketEvents.UPDATE_PLAYERS)[0]?.payload)
      .toEqual([{ id: "socket-2", x: 1.23, y: 2.99 }]);
  });

  it("受信者自身の座標はUPDATE_PLAYERSへ含めないこと", () => {
    const { service, calls } = setupService();

    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-1", x: 1, y: 2 },
    ]);

    expect(filterEvent(calls, protocol.SocketEvents.UPDATE_PLAYERS)).toHaveLength(
      0,
    );
  });

  it("AOI外のプレイヤーの座標はUPDATE_PLAYERSへ含めないこと", () => {
    const { service, calls } = setupService({
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 100, y: 100 },
    ]);

    expect(filterEvent(calls, protocol.SocketEvents.UPDATE_PLAYERS)).toHaveLength(
      0,
    );
  });

  it("前回と同一座標の場合はUPDATE_PLAYERSを送信しないこと", () => {
    const { service, calls } = setupService({
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 1, y: 2 },
    ]);
    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 1, y: 2 },
    ]);

    expect(filterEvent(calls, protocol.SocketEvents.UPDATE_PLAYERS)).toHaveLength(
      1,
    );
  });

  it("量子化後に同値となる微小移動はUPDATE_PLAYERSを送信しないこと", () => {
    const { service, calls } = setupService({
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 1, y: 2 },
    ]);
    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 1.0001, y: 2 },
    ]);

    expect(filterEvent(calls, protocol.SocketEvents.UPDATE_PLAYERS)).toHaveLength(
      1,
    );
  });

  it("座標が変化した場合はUPDATE_PLAYERSを再送信すること", () => {
    const { service, calls } = setupService({
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 1, y: 2 },
    ]);
    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 1.5, y: 2 },
    ]);

    expect(filterEvent(calls, protocol.SocketEvents.UPDATE_PLAYERS)).toHaveLength(
      2,
    );
  });

  it("差分送信対象が空の場合はUPDATE_PLAYERSを送信しないこと", () => {
    const { service, calls } = setupService();

    service.publishUpdatePlayersToRoom("room-1", []);

    expect(filterEvent(calls, protocol.SocketEvents.UPDATE_PLAYERS)).toHaveLength(
      0,
    );
  });

  it("ルームにプレイヤーがいない場合は何も送信しないこと", () => {
    const { service, calls } = setupService({ players: [] });

    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 1, y: 2 },
    ]);

    expect(calls).toHaveLength(0);
  });

  it("受信者ごとに爆弾同期サービスを呼び出すこと", () => {
    const bombs: ActiveBombSnapshot[] = [
      {
        bombId: "bomb-1",
        ownerPlayerId: "socket-2",
        ownerTeamId: 0,
        x: 0,
        y: 0,
        explodeAtElapsedMs: 1000,
      },
    ];
    const { service, syncVisibleBombsByViewer } = setupService({ bombs });

    service.publishUpdatePlayersToRoom("room-1", []);

    expect(syncVisibleBombsByViewer).toHaveBeenCalledWith(
      "room-1",
      "socket-1",
      createPlayer("socket-1"),
      bombs,
    );
  });

  it("受信者ごとにAOIセルキャッシュを更新すること", () => {
    const { service, updateViewerAoiCellCache } = setupService({
      memberIds: ["socket-1", "socket-2"],
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishUpdatePlayersToRoom("room-1", []);

    expect(updateViewerAoiCellCache).toHaveBeenCalledTimes(2);
  });

  it("複数の受信者それぞれへ送信すること", () => {
    const { service, calls } = setupService({
      memberIds: ["socket-1", "socket-2"],
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-1", x: 1, y: 1 },
      { id: "socket-2", x: 2, y: 2 },
    ]);

    expect(
      filterEvent(calls, protocol.SocketEvents.UPDATE_PLAYERS).map(
        (call) => call.socketId,
      ),
    ).toEqual(["socket-1", "socket-2"]);
  });

  it("Botの受信者へは送信しないこと", () => {
    const { service, calls } = setupService({
      memberIds: ["socket-1", "bot:room-1:1"],
      players: [createPlayer("socket-1"), createPlayer("bot:room-1:1")],
    });

    service.publishUpdatePlayersToRoom("room-1", []);

    expect(calls.every((call) => call.socketId === "socket-1")).toBe(true);
  });

  it("Botプレイヤーも可視プレイヤーとして受信者へ通知すること", () => {
    const { service, calls } = setupService({
      memberIds: ["socket-1", "bot:room-1:1"],
      players: [createPlayer("socket-1"), createPlayer("bot:room-1:1")],
    });

    service.publishUpdatePlayersToRoom("room-1", []);

    expect(
      filterEvent(calls, protocol.SocketEvents.NEW_PLAYER).map(
        (call) => (call.payload as domain.game.player.PlayerData).id,
      ),
    ).toEqual(["socket-1", "bot:room-1:1"]);
  });

  it("スナップショットから外れて戻ったプレイヤーの座標は再送信すること", () => {
    const other = createPlayer("socket-2");
    const { service, calls } = setupService({
      players: [createPlayer("socket-1"), other],
    });

    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 1, y: 2 },
    ]);
    other.x = 100;
    other.y = 100;
    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 100, y: 100 },
    ]);
    other.x = 1;
    other.y = 2;
    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 1, y: 2 },
    ]);

    expect(filterEvent(calls, protocol.SocketEvents.UPDATE_PLAYERS)).toHaveLength(
      2,
    );
  });

  it("スナップショットが可視のまま差分座標だけAOI外へ出て戻った場合は再送信しないこと", () => {
    const { service, calls } = setupService({
      players: [createPlayer("socket-1"), createPlayer("socket-2")],
    });

    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 1, y: 2 },
    ]);
    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 100, y: 100 },
    ]);
    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-2", x: 1, y: 2 },
    ]);

    expect(filterEvent(calls, protocol.SocketEvents.UPDATE_PLAYERS)).toHaveLength(
      1,
    );
  });

  it("送信するプレイヤー配列に存在しないIDは無視すること", () => {
    const { service, calls } = setupService();

    service.publishUpdatePlayersToRoom("room-1", [
      { id: "socket-unknown", x: 1, y: 1 },
    ]);

    expect(filterEvent(calls, protocol.SocketEvents.UPDATE_PLAYERS)[0]?.payload)
      .toEqual([{ id: "socket-unknown", x: 1, y: 1 }]);
  });
});
