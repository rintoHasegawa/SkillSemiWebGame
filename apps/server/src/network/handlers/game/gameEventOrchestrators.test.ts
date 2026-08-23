/**
 * gameEventOrchestrators.test
 * ゲーム受信イベント調停の現行挙動を固定する characterization test
 * ユースケースへの入力値変換とランタイム未解決時のログ分岐を検証する
 */
import { contracts as protocol, domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  RoomOutputPort,
  RoomPhaseTransitionResult,
  RoomScopedGamePort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import { logResults, logScopes } from "@server/logging/index";
import {
  createRoom as createRoomFixture,
  createRoomMember,
} from "@server/testing/roomFixtures";
import type { GameOutputAdapter } from "./createGameOutputAdapter";
import {
  handleBombHitReportEvent,
  handleMoveEvent,
  handlePingEvent,
  handlePlaceBombEvent,
  handleReadyForGameEvent,
  handleStartGameEvent,
  type GameEventOrchestratorDeps,
} from "./gameEventOrchestrators";

const FIXED_NOW_MS = 1_700_000_000_000;
// サーバー経過時間から解決される爆発予定時刻（申告値と区別するため別値にする）
const SERVER_EXPLODE_AT_ELAPSED_MS = 6_000;

/** オーナー1名が在室するテスト用のルーム状態を生成する */
const createRoom = (): domain.room.Room => {
  return createRoomFixture({
    players: [createRoomMember({ name: "name-1", isOwner: true })],
    maxPlayers: 100,
  });
};

type GameManagerStubParams = {
  shouldBroadcastBombPlaced?: boolean;
  shouldBroadcastBombHitReport?: boolean;
  isSameTeamBombHitReport?: boolean;
};

/** ルーム単位ゲーム管理ポートを満たすスタブを生成する */
const createGameManagerStub = ({
  shouldBroadcastBombPlaced = true,
  shouldBroadcastBombHitReport = true,
  isSameTeamBombHitReport = false,
}: GameManagerStubParams = {}) => {
  return {
    startRoomSession: vi.fn<RoomScopedGamePort["startRoomSession"]>(),
    getRoomStartTime: vi.fn<RoomScopedGamePort["getRoomStartTime"]>(
      () => undefined,
    ),
    getRoomFieldConfig: vi.fn<RoomScopedGamePort["getRoomFieldConfig"]>(
      () => undefined,
    ),
    getRoomPlayers: vi.fn<RoomScopedGamePort["getRoomPlayers"]>(() => []),
    movePlayer: vi.fn<RoomScopedGamePort["movePlayer"]>(),
    shouldBroadcastBombPlaced: vi.fn<
      RoomScopedGamePort["shouldBroadcastBombPlaced"]
    >(() => shouldBroadcastBombPlaced),
    shouldAcceptBombPlacement: vi.fn<
      RoomScopedGamePort["shouldAcceptBombPlacement"]
    >(() => true),
    issueServerBombId: vi.fn<RoomScopedGamePort["issueServerBombId"]>(
      () => "bomb-1",
    ),
    resolveBombExplodeAtElapsedMs: vi.fn<
      RoomScopedGamePort["resolveBombExplodeAtElapsedMs"]
    >(() => SERVER_EXPLODE_AT_ELAPSED_MS),
    registerActiveBomb: vi.fn<RoomScopedGamePort["registerActiveBomb"]>(),
    getPlayerTeamId: vi.fn<RoomScopedGamePort["getPlayerTeamId"]>(() => 2),
    getActiveBombSnapshots: vi.fn<
      RoomScopedGamePort["getActiveBombSnapshots"]
    >(() => []),
    shouldBroadcastBombHitReport: vi.fn<
      RoomScopedGamePort["shouldBroadcastBombHitReport"]
    >(() => shouldBroadcastBombHitReport),
    isSameTeamBombHitReport: vi.fn<
      RoomScopedGamePort["isSameTeamBombHitReport"]
    >(() => isSameTeamBombHitReport),
    recordBombHitForOwner: vi.fn<RoomScopedGamePort["recordBombHitForOwner"]>(),
    removePlayer: vi.fn<RoomScopedGamePort["removePlayer"]>(),
    replaceDisconnectedPlayerWithBot: vi.fn<
      RoomScopedGamePort["replaceDisconnectedPlayerWithBot"]
    >(() => false),
  } satisfies RoomScopedGamePort;
};

/** 送信内容を記録するゲーム出力アダプタースタブを生成する */
const createOutputStub = () => {
  return {
    publishPongToSocket: vi.fn<GameOutputAdapter["publishPongToSocket"]>(),
    publishUpdatePlayersToRoom: vi.fn<
      GameOutputAdapter["publishUpdatePlayersToRoom"]
    >(),
    publishMapCellUpdatesToRoom: vi.fn<
      GameOutputAdapter["publishMapCellUpdatesToRoom"]
    >(),
    publishCurrentHurricanesToRoom: vi.fn<
      GameOutputAdapter["publishCurrentHurricanesToRoom"]
    >(),
    publishUpdateHurricanesToRoom: vi.fn<
      GameOutputAdapter["publishUpdateHurricanesToRoom"]
    >(),
    publishGameEndToRoom: vi.fn<GameOutputAdapter["publishGameEndToRoom"]>(),
    publishGameResultToRoom: vi.fn<
      GameOutputAdapter["publishGameResultToRoom"]
    >(),
    publishGameStartToRoom: vi.fn<GameOutputAdapter["publishGameStartToRoom"]>(),
    publishCurrentPlayersToSocket: vi.fn<
      GameOutputAdapter["publishCurrentPlayersToSocket"]
    >(),
    publishGameStartToSocket: vi.fn<
      GameOutputAdapter["publishGameStartToSocket"]
    >(),
    publishBombPlacedToOthersInRoom: vi.fn<
      GameOutputAdapter["publishBombPlacedToOthersInRoom"]
    >(),
    publishBombPlacedAckToSocket: vi.fn<
      GameOutputAdapter["publishBombPlacedAckToSocket"]
    >(),
    publishPlayerHitToOthersInRoom: vi.fn<
      GameOutputAdapter["publishPlayerHitToOthersInRoom"]
    >(),
    publishPlayerHitToRoom: vi.fn<GameOutputAdapter["publishPlayerHitToRoom"]>(),
    publishHurricaneHitToRoom: vi.fn<
      GameOutputAdapter["publishHurricaneHitToRoom"]
    >(),
  } satisfies GameOutputAdapter;
};

/** ルーム状態配信を記録する出力スタブを生成する */
const createRoomOutputStub = () => {
  return {
    publishRoomUpdateToRoom: vi.fn<
      RoomOutputPort["publishRoomUpdateToRoom"]
    >(),
  };
};

type DepsParams = {
  room?: domain.room.Room;
  gameManager?: RoomScopedGamePort;
};

/** ゲームイベント調停で利用する依存集合スタブを生成する */
const createDeps = ({
  room,
  gameManager,
}: DepsParams): GameEventOrchestratorDeps & {
  output: ReturnType<typeof createOutputStub>;
  roomOutput: ReturnType<typeof createRoomOutputStub>;
} => {
  const transition: RoomPhaseTransitionResult = room
    ? { status: "updated", room }
    : { status: "not_found" };

  return {
    socketId: "socket-1",
    roomManager: {
      getRoomByOwnerId: vi.fn<
        (ownerId: string) => domain.room.Room | undefined
      >(() => room),
      getRoomByPlayerId: vi.fn<
        (playerId: string) => domain.room.Room | undefined
      >(() => room),
      markRoomPlaying: vi.fn<(roomId: string) => RoomPhaseTransitionResult>(
        () => transition,
      ),
      markRoomWaiting: vi.fn<(roomId: string) => RoomPhaseTransitionResult>(
        () => transition,
      ),
      applyFieldSizePreset: vi.fn<
        (
          roomId: string,
          fieldSizePreset: domain.room.Room["fieldSizePreset"],
        ) => domain.room.Room | undefined
      >((_roomId, fieldSizePreset) => {
        if (!room) {
          return undefined;
        }

        room.fieldSizePreset = fieldSizePreset;
        return room;
      }),
      deleteRoom: vi.fn<(roomId: string) => boolean>(() => true),
    },
    runtimeRegistry: {
      getGameManagerByRoomId: vi.fn<
        (roomId: string) => RoomScopedGamePort | undefined
      >(() => gameManager),
      getGameManagerByPlayerId: vi.fn<
        (playerId: string) => RoomScopedGamePort | undefined
      >(() => gameManager),
      cleanupGameManagerForRoom: vi.fn<(roomId: string) => void>(),
    },
    output: createOutputStub(),
    roomOutput: createRoomOutputStub(),
  };
};

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW_MS);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handlePingEvent", () => {
  it("受信したクライアント時刻とサーバー時刻でPONGを返すこと", () => {
    const deps = createDeps({});

    handlePingEvent(deps, 123);

    expect(deps.output.publishPongToSocket).toHaveBeenCalledWith({
      clientTime: 123,
      serverTime: FIXED_NOW_MS,
    });
  });

  it("ランタイム解決を行わずにPONGを返すこと", () => {
    const deps = createDeps({});

    handlePingEvent(deps, 0);

    expect(deps.roomManager.getRoomByPlayerId).not.toHaveBeenCalled();
  });
});

describe("handleStartGameEvent", () => {
  it("要求プリセットを反映してセッションを開始すること", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: createRoom(), gameManager });

    handleStartGameEvent(deps, {
      targetPlayerCount: 8,
      fieldSizePreset: "SMALL",
    });

    expect(gameManager.startRoomSession.mock.calls[0]?.[2]).toEqual({
      fieldSizePreset: "SMALL",
      gridCols: 24,
      gridRows: 24,
    });
  });

  it("要求人数を反映したプレイヤーIDでセッションを開始すること", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: createRoom(), gameManager });

    handleStartGameEvent(deps, { targetPlayerCount: 8 });

    expect(gameManager.startRoomSession.mock.calls[0]?.[0]).toHaveLength(8);
  });

  it("オーナーのルームが無い場合はセッションを開始しないこと", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: undefined, gameManager });

    handleStartGameEvent(deps, {});

    expect(gameManager.startRoomSession).not.toHaveBeenCalled();
  });

  it("ランタイム未解決時はルームをwaitingへ戻すこと", () => {
    const deps = createDeps({ room: createRoom(), gameManager: undefined });

    handleStartGameEvent(deps, {});

    expect(deps.roomManager.markRoomWaiting).toHaveBeenCalledWith("room-1");
  });

  it("ランタイム未解決時はwaitingへ戻したルームをROOM_UPDATEで配信すること", () => {
    const room = createRoom();
    const deps = createDeps({ room, gameManager: undefined });

    handleStartGameEvent(deps, {});

    expect(deps.roomOutput.publishRoomUpdateToRoom).toHaveBeenCalledWith(
      "room-1",
      room,
    );
  });
});

describe("handleReadyForGameEvent", () => {
  it("ランタイム解決時は現在プレイヤー一覧を送ること", () => {
    const gameManager = createGameManagerStub();
    gameManager.getRoomPlayers.mockReturnValue([
      { id: "socket-1", name: "name-1", x: 1, y: 2, teamId: 0 },
    ]);
    const deps = createDeps({ room: createRoom(), gameManager });

    handleReadyForGameEvent(deps);

    expect(deps.output.publishCurrentPlayersToSocket).toHaveBeenCalledWith([
      { id: "socket-1", name: "name-1", teamId: 0, x: 1, y: 2 },
    ]);
  });

  it("ランタイム未解決時は空のプレイヤー一覧を送ること", () => {
    const deps = createDeps({ room: createRoom(), gameManager: undefined });

    handleReadyForGameEvent(deps);

    expect(deps.output.publishCurrentPlayersToSocket).toHaveBeenCalledWith([]);
  });
});

describe("handleMoveEvent", () => {
  it("量子化した座標で移動を適用すること", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: createRoom(), gameManager });

    handleMoveEvent(deps, { x: 1.234_5, y: 2.345_6 });

    expect(gameManager.movePlayer).toHaveBeenCalledWith("socket-1", 1.23, 2.35);
  });

  it("ランタイム未解決時は移動を適用しないこと", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: undefined, gameManager });

    handleMoveEvent(deps, { x: 1, y: 2 });

    expect(gameManager.movePlayer).not.toHaveBeenCalled();
  });

  it("ランタイム未解決時はignored_missing_roomを記録すること", () => {
    const deps = createDeps({ room: undefined, gameManager: undefined });

    handleMoveEvent(deps, { x: 1, y: 2 });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: protocol.SocketEvents.MOVE,
      result: logResults.IGNORED_MISSING_ROOM,
      socketId: "socket-1",
    });
  });

  it("ランタイム解決時はignored_missing_roomを記録しないこと", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub(),
    });

    handleMoveEvent(deps, { x: 1, y: 2 });

    expect(logSpy).not.toHaveBeenCalled();
  });
});

describe("handlePlaceBombEvent", () => {
  it("設置した爆弾を他プレイヤーへ配信すること", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: createRoom(), gameManager });

    handlePlaceBombEvent(deps, {
      requestId: "req-1",
      x: 3,
      y: 4,
      explodeAtElapsedMs: 5_000,
    });

    expect(deps.output.publishBombPlacedToOthersInRoom).toHaveBeenCalledWith(
      "room-1",
      "socket-1",
      {
        bombId: "bomb-1",
        ownerTeamId: 2,
        x: 3,
        y: 4,
        explodeAtElapsedMs: SERVER_EXPLODE_AT_ELAPSED_MS,
      },
    );
  });

  it("設置者本人へACKを返すこと", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub(),
    });

    handlePlaceBombEvent(deps, {
      requestId: "req-1",
      x: 3,
      y: 4,
      explodeAtElapsedMs: 5_000,
    });

    expect(deps.output.publishBombPlacedAckToSocket).toHaveBeenCalledWith(
      "socket-1",
      { requestId: "req-1", bombId: "bomb-1" },
    );
  });

  it("重複排除判定に現在時刻を渡すこと", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: createRoom(), gameManager });

    handlePlaceBombEvent(deps, {
      requestId: "req-1",
      x: 3,
      y: 4,
      explodeAtElapsedMs: 5_000,
    });

    expect(gameManager.shouldBroadcastBombPlaced).toHaveBeenCalledWith(
      "8:socket-1|5:req-1",
      FIXED_NOW_MS,
    );
  });

  it("重複要求の場合は配信しないこと", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub({ shouldBroadcastBombPlaced: false }),
    });

    handlePlaceBombEvent(deps, {
      requestId: "req-1",
      x: 3,
      y: 4,
      explodeAtElapsedMs: 5_000,
    });

    expect(deps.output.publishBombPlacedToOthersInRoom).not.toHaveBeenCalled();
  });

  it("ランタイム未解決時はignored_missing_roomを記録すること", () => {
    const deps = createDeps({ room: undefined, gameManager: undefined });

    handlePlaceBombEvent(deps, {
      requestId: "req-1",
      x: 3,
      y: 4,
      explodeAtElapsedMs: 5_000,
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: protocol.SocketEvents.PLACE_BOMB,
      result: logResults.IGNORED_MISSING_ROOM,
      socketId: "socket-1",
    });
  });
});

describe("handleBombHitReportEvent", () => {
  it("被弾報告を同一ルームの他プレイヤーへ配信すること", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub(),
    });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(deps.output.publishPlayerHitToOthersInRoom).toHaveBeenCalledWith(
      "room-1",
      "socket-1",
      { playerId: "socket-1" },
    );
  });

  it("被弾報告を爆弾所有者のスタッツへ記録すること", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: createRoom(), gameManager });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(gameManager.recordBombHitForOwner).toHaveBeenCalledWith("bomb-1");
  });

  it("重複排除判定に現在時刻を渡すこと", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: createRoom(), gameManager });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(gameManager.shouldBroadcastBombHitReport).toHaveBeenCalledWith(
      "8:socket-1|6:bomb-1",
      FIXED_NOW_MS,
    );
  });

  it("同チームの爆弾への被弾報告はスタッツへ記録しないこと", () => {
    const gameManager = createGameManagerStub({
      isSameTeamBombHitReport: true,
    });
    const deps = createDeps({ room: createRoom(), gameManager });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(gameManager.recordBombHitForOwner).not.toHaveBeenCalled();
  });

  it("同チームの爆弾への被弾報告は配信しないこと", () => {
    const gameManager = createGameManagerStub({
      isSameTeamBombHitReport: true,
    });
    const deps = createDeps({ room: createRoom(), gameManager });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(deps.output.publishPlayerHitToOthersInRoom).not.toHaveBeenCalled();
  });

  it("重複報告の場合は配信しないこと", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub({
        shouldBroadcastBombHitReport: false,
      }),
    });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(deps.output.publishPlayerHitToOthersInRoom).not.toHaveBeenCalled();
  });

  it("ランタイム未解決時はignored_missing_roomを記録すること", () => {
    const deps = createDeps({ room: undefined, gameManager: undefined });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      result: logResults.IGNORED_MISSING_ROOM,
      socketId: "socket-1",
    });
  });
});
