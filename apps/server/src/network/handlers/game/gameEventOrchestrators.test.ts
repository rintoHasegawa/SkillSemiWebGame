/**
 * gameEventOrchestrators.test
 * ゲーム受信イベント調停の挙動を検証するユニットテスト
 * ユースケースへの入力値変換とランタイム未解決時のログ分岐を検証する
 * PINGもゲーム時計を持つランタイム経由で解決するため壁時計は使わない
 */
import { contracts as protocol, domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BombHitReportOriginDecision } from "@server/domains/game/application/ports/gameUseCasePorts";
import type {
  RoomOutputPort,
  RoomPhaseTransitionResult,
  RoomScopedGamePort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
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
  bombHitReportOrigin?: BombHitReportOriginDecision;
  /** 進行中セッションの符号付きゲーム経過ms（未開始は undefined） */
  signedElapsedMs?: number;
};

/** ルーム単位ゲーム管理ポートを満たすスタブを生成する */
const createGameManagerStub = ({
  shouldBroadcastBombPlaced = true,
  shouldBroadcastBombHitReport = true,
  isSameTeamBombHitReport = false,
  bombHitReportOrigin = { status: "valid" },
  signedElapsedMs,
}: GameManagerStubParams = {}) => {
  return {
    startRoomSession: vi.fn<RoomScopedGamePort["startRoomSession"]>(),
    getRoomSignedElapsedMs: vi.fn<
      RoomScopedGamePort["getRoomSignedElapsedMs"]
    >(() => signedElapsedMs),
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
    checkBombHitReportOrigin: vi.fn<
      RoomScopedGamePort["checkBombHitReportOrigin"]
    >(() => bombHitReportOrigin),
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
    closeRoomChannel: vi.fn<RoomOutputPort["closeRoomChannel"]>(),
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handlePingEvent", () => {
  it("受信したクライアント時刻とゲーム経過msでPONGを返すこと", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub({ signedElapsedMs: 1_000 }),
    });

    handlePingEvent(deps, 123);

    expect(deps.output.publishPongToSocket).toHaveBeenCalledWith({
      clientTime: 123,
      serverReceivedElapsedMs: 1_000,
      serverSentElapsedMs: 1_000,
    });
  });

  it("カウントダウン中は負のゲーム経過msでPONGを返すこと", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub({ signedElapsedMs: -2_500 }),
    });

    handlePingEvent(deps, 0);

    expect(deps.output.publishPongToSocket).toHaveBeenCalledWith(
      expect.objectContaining({ serverReceivedElapsedMs: -2_500 }),
    );
  });

  it("ゲーム時計を引くためプレイヤー所属ルームを解決すること", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub({ signedElapsedMs: 0 }),
    });

    handlePingEvent(deps, 0);

    expect(deps.roomManager.getRoomByPlayerId).toHaveBeenCalledWith("socket-1");
  });

  it("セッション未開始の場合はPONGを返さないこと", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub(),
    });

    handlePingEvent(deps, 123);

    expect(deps.output.publishPongToSocket).not.toHaveBeenCalled();
  });

  it("セッション未開始の場合はセッション未開始として記録すること", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub(),
    });

    handlePingEvent(deps, 123);

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.PING,
      result: logResults.IGNORED_SESSION_NOT_STARTED,
      socketId: "socket-1",
    });
  });

  it("ランタイム未解決時はPONGを返さないこと", () => {
    const deps = createDeps({ room: undefined, gameManager: undefined });

    handlePingEvent(deps, 123);

    expect(deps.output.publishPongToSocket).not.toHaveBeenCalled();
  });

  it("ランタイム未解決時はignored_missing_roomを記録すること", () => {
    const deps = createDeps({ room: undefined, gameManager: undefined });

    handlePingEvent(deps, 123);

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: protocol.SocketEvents.PING,
      result: logResults.IGNORED_MISSING_ROOM,
      socketId: "socket-1",
    });
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

  it("重複排除判定へ壁時計を渡さずキーのみで委譲すること", () => {
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

  it("重複排除判定へ壁時計を渡さずキーのみで委譲すること", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: createRoom(), gameManager });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(gameManager.shouldBroadcastBombHitReport).toHaveBeenCalledWith(
      "8:socket-1|6:bomb-1",
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

  it("実在しない爆弾の報告はignored_unknown_bombを記録すること", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub({
        bombHitReportOrigin: { status: "unknown_bomb" },
      }),
    });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.BOMB_HIT_REPORT,
      result: logResults.IGNORED_UNKNOWN_BOMB,
      socketId: "socket-1",
      roomId: "room-1",
    });
  });

  it("受理時刻窓を過ぎた報告はignored_expired_bombを記録すること", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub({
        bombHitReportOrigin: { status: "expired" },
      }),
    });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.BOMB_HIT_REPORT,
      result: logResults.IGNORED_EXPIRED_BOMB,
      socketId: "socket-1",
      roomId: "room-1",
    });
  });

  it("爆風から離れすぎた報告はignored_out_of_rangeを記録すること", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub({
        bombHitReportOrigin: { status: "too_far" },
      }),
    });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.BOMB_HIT_REPORT,
      result: logResults.IGNORED_OUT_OF_RANGE,
      socketId: "socket-1",
      roomId: "room-1",
    });
  });

  it("同チームの爆弾への被弾報告はignored_same_teamを記録すること", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub({ isSameTeamBombHitReport: true }),
    });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.BOMB_HIT_REPORT,
      result: logResults.IGNORED_SAME_TEAM,
      socketId: "socket-1",
      roomId: "room-1",
    });
  });

  it("重複報告はignored_duplicateを記録すること", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub({
        shouldBroadcastBombHitReport: false,
      }),
    });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.BOMB_HIT_REPORT,
      result: logResults.IGNORED_DUPLICATE,
      socketId: "socket-1",
      roomId: "room-1",
    });
  });

  it("受理した報告はログを記録しないこと", () => {
    const deps = createDeps({
      room: createRoom(),
      gameManager: createGameManagerStub(),
    });

    handleBombHitReportEvent(deps, { bombId: "bomb-1" });

    expect(logSpy).not.toHaveBeenCalled();
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
