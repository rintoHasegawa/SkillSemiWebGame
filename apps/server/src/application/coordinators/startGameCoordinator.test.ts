/**
 * startGameCoordinator.test
 * START_GAME調停の仕様適合を検証するテスト
 * ルーム未検出・状態遷移失敗の分岐，フィールド設定解決とBot補充，終了時の後始末（配信チャンネル閉鎖を含む）を検証する
 * ランタイム未解決時はwaitingへロールバックしROOM_UPDATEで通知する（Issue #291）
 */
import { domain } from "@repo/shared";
import type { FieldSizePreset } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StartGameOutputPort } from "@server/domains/game/application/ports/gameUseCasePorts";
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
import { config } from "@server/config";
import { RoomManager } from "@server/domains/room/RoomManager";
import {
  createRoom as createRoomFixture,
  createRoomMember,
} from "@server/testing/roomFixtures";
import { startGameCoordinator } from "./startGameCoordinator";

type RoomParams = {
  roomId?: string;
  playerCount?: number;
  fieldSizePreset?: FieldSizePreset;
  teamAssignmentMode?: domain.room.TeamAssignmentMode;
  preferredTeamIds?: (number | null)[];
};

/** 参加人数とチーム希望を指定してテスト用のルーム状態を生成する */
const createRoom = ({
  roomId = "room-1",
  playerCount = 1,
  fieldSizePreset = "MEDIUM",
  teamAssignmentMode = "random",
  preferredTeamIds = [],
}: RoomParams = {}): domain.room.Room => {
  return createRoomFixture({
    roomId,
    players: Array.from({ length: playerCount }, (_, index) =>
      createRoomMember({
        id: `socket-${index + 1}`,
        name: `name-${index + 1}`,
        isOwner: index === 0,
        preferredTeamId: preferredTeamIds[index] ?? null,
      }),
    ),
    maxPlayers: 100,
    fieldSizePreset,
    teamAssignmentMode,
  });
};

/** ルーム単位ゲーム管理ポートを満たすスタブを生成する */
const createGameManagerStub = (signedElapsedMs?: number) => {
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
    >(() => true),
    shouldAcceptBombPlacement: vi.fn<
      RoomScopedGamePort["shouldAcceptBombPlacement"]
    >(() => true),
    issueServerBombId: vi.fn<RoomScopedGamePort["issueServerBombId"]>(
      () => "bomb-1",
    ),
    resolveBombExplodeAtElapsedMs: vi.fn<
      RoomScopedGamePort["resolveBombExplodeAtElapsedMs"]
    >(() => 1_000),
    registerActiveBomb: vi.fn<RoomScopedGamePort["registerActiveBomb"]>(),
    getPlayerTeamId: vi.fn<RoomScopedGamePort["getPlayerTeamId"]>(() => 0),
    getActiveBombSnapshots: vi.fn<
      RoomScopedGamePort["getActiveBombSnapshots"]
    >(() => []),
    shouldBroadcastBombHitReport: vi.fn<
      RoomScopedGamePort["shouldBroadcastBombHitReport"]
    >(() => true),
    isSameTeamBombHitReport: vi.fn<
      RoomScopedGamePort["isSameTeamBombHitReport"]
    >(() => false),
    checkBombHitReportOrigin: vi.fn<
      RoomScopedGamePort["checkBombHitReportOrigin"]
    >(() => ({ status: "valid" })),
    recordBombHitForOwner: vi.fn<RoomScopedGamePort["recordBombHitForOwner"]>(),
    removePlayer: vi.fn<RoomScopedGamePort["removePlayer"]>(),
    replaceDisconnectedPlayerWithBot: vi.fn<
      RoomScopedGamePort["replaceDisconnectedPlayerWithBot"]
    >(() => false),
  } satisfies RoomScopedGamePort;
};

type DepsParams = {
  room?: domain.room.Room;
  transitionResult?: RoomPhaseTransitionResult;
  rollbackResult?: RoomPhaseTransitionResult;
  gameManager?: RoomScopedGamePort;
  canApplyFieldSizePreset?: boolean;
};

/** ルーム管理・ランタイム管理・ルーム出力のスタブを生成する */
const createDeps = ({
  room,
  transitionResult,
  rollbackResult,
  gameManager,
  canApplyFieldSizePreset = true,
}: DepsParams) => {
  const resolvedTransition: RoomPhaseTransitionResult =
    transitionResult ??
    (room ? { status: "updated", room } : { status: "not_found" });
  const resolvedRollback: RoomPhaseTransitionResult =
    rollbackResult ??
    (room ? { status: "updated", room } : { status: "not_found" });

  return {
    roomManager: {
      getRoomByOwnerId: vi.fn<
        (ownerId: string) => domain.room.Room | undefined
      >(() => room),
      markRoomPlaying: vi.fn<(roomId: string) => RoomPhaseTransitionResult>(
        () => resolvedTransition,
      ),
      markRoomWaiting: vi.fn<(roomId: string) => RoomPhaseTransitionResult>(
        () => resolvedRollback,
      ),
      // 実サービスと同じく，反映したルームを返す（未検出時はundefined）
      applyFieldSizePreset: vi.fn<
        (
          roomId: string,
          fieldSizePreset: domain.room.Room["fieldSizePreset"],
        ) => domain.room.Room | undefined
      >((_roomId, fieldSizePreset) => {
        if (!room || !canApplyFieldSizePreset) {
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
      cleanupGameManagerForRoom: vi.fn<(roomId: string) => void>(),
    },
    roomOutput: {
      publishRoomUpdateToRoom: vi.fn<
        RoomOutputPort["publishRoomUpdateToRoom"]
      >(),
      closeRoomChannel: vi.fn<RoomOutputPort["closeRoomChannel"]>(),
    },
  };
};

/** 送信内容を記録する出力ポートスタブを生成する */
const createOutputStub = () => {
  return {
    publishUpdatePlayersToRoom: vi.fn<
      StartGameOutputPort["publishUpdatePlayersToRoom"]
    >(),
    publishMapCellUpdatesToRoom: vi.fn<
      StartGameOutputPort["publishMapCellUpdatesToRoom"]
    >(),
    publishCurrentHurricanesToRoom: vi.fn<
      StartGameOutputPort["publishCurrentHurricanesToRoom"]
    >(),
    publishUpdateHurricanesToRoom: vi.fn<
      StartGameOutputPort["publishUpdateHurricanesToRoom"]
    >(),
    publishGameEndToRoom: vi.fn<
      StartGameOutputPort["publishGameEndToRoom"]
    >(),
    publishGameResultToRoom: vi.fn<
      StartGameOutputPort["publishGameResultToRoom"]
    >(),
    publishGameStartToRoom: vi.fn<
      StartGameOutputPort["publishGameStartToRoom"]
    >(),
    publishBombPlacedToOthersInRoom: vi.fn<
      StartGameOutputPort["publishBombPlacedToOthersInRoom"]
    >(),
    publishBombPlacedAckToSocket: vi.fn<
      StartGameOutputPort["publishBombPlacedAckToSocket"]
    >(),
    publishPlayerHitToOthersInRoom: vi.fn<
      StartGameOutputPort["publishPlayerHitToOthersInRoom"]
    >(),
    publishPlayerHitToRoom: vi.fn<
      StartGameOutputPort["publishPlayerHitToRoom"]
    >(),
    publishHurricaneHitToRoom: vi.fn<
      StartGameOutputPort["publishHurricaneHitToRoom"]
    >(),
  } satisfies StartGameOutputPort;
};

describe("startGameCoordinator", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("オーナーのルームが見つからない場合はセッションを開始しないこと", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: undefined, gameManager });

    startGameCoordinator({
      ownerId: "socket-1",
      ...deps,
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession).not.toHaveBeenCalled();
    expect(deps.roomManager.markRoomPlaying).not.toHaveBeenCalled();
  });

  it("オーナーのルームが見つからない場合はignored_no_roomを記録すること", () => {
    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({ room: undefined }),
      output: createOutputStub(),
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.IGNORED_NO_ROOM,
      socketId: "socket-1",
    });
  });

  it("状態遷移がnot_foundの場合はセッションを開始しないこと", () => {
    const gameManager = createGameManagerStub();

    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({
        room: createRoom(),
        transitionResult: { status: "not_found" },
        gameManager,
      }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession).not.toHaveBeenCalled();
  });

  it("状態遷移がnot_foundの場合はignored_room_not_foundを記録すること", () => {
    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({
        room: createRoom(),
        transitionResult: { status: "not_found" },
      }),
      output: createOutputStub(),
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.IGNORED_ROOM_NOT_FOUND,
      roomId: "room-1",
      socketId: "socket-1",
    });
  });

  it("状態遷移がinvalid_transitionの場合はセッションを開始しないこと", () => {
    const gameManager = createGameManagerStub();

    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({
        room: createRoom(),
        transitionResult: { status: "invalid_transition" },
        gameManager,
      }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession).not.toHaveBeenCalled();
  });

  it("状態遷移がinvalid_transitionの場合はignored_already_playingを記録すること", () => {
    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({
        room: createRoom(),
        transitionResult: { status: "invalid_transition" },
      }),
      output: createOutputStub(),
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.IGNORED_ALREADY_PLAYING,
      roomId: "room-1",
      socketId: "socket-1",
    });
  });

  it("要求プリセットが指定された場合はそのグリッドサイズでセッションを開始すること", () => {
    const gameManager = createGameManagerStub();

    startGameCoordinator({
      ownerId: "socket-1",
      requestedFieldSizePreset: "SMALL",
      ...createDeps({ room: createRoom({ fieldSizePreset: "LARGE" }), gameManager }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession.mock.calls[0]?.[2]).toEqual({
      fieldSizePreset: "SMALL",
      gridCols: 24,
      gridRows: 24,
    });
  });

  it("要求プリセット未指定の場合はルームのプリセットを使用すること", () => {
    const gameManager = createGameManagerStub();

    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({ room: createRoom({ fieldSizePreset: "LARGE" }), gameManager }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession.mock.calls[0]?.[2]).toEqual({
      fieldSizePreset: "LARGE",
      gridCols: 45,
      gridRows: 45,
    });
  });

  it("ルームのプリセットも未設定の場合は既定プリセットを使用すること", () => {
    const gameManager = createGameManagerStub();
    const room = createRoom();
    // 型上は必須だが実行時欠損した場合の既定フォールバックを検証する
    Reflect.deleteProperty(room, "fieldSizePreset");

    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({ room, gameManager }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession.mock.calls[0]?.[2]).toEqual({
      fieldSizePreset: "MEDIUM",
      gridCols: 36,
      gridRows: 36,
    });
  });

  it("解決したプリセットをルーム管理経由で反映すること", () => {
    const room = createRoom({ fieldSizePreset: "MEDIUM" });
    const deps = createDeps({ room, gameManager: createGameManagerStub() });

    startGameCoordinator({
      ownerId: "socket-1",
      requestedFieldSizePreset: "XLARGE",
      ...deps,
      output: createOutputStub(),
    });

    expect(deps.roomManager.applyFieldSizePreset).toHaveBeenCalledWith(
      "room-1",
      "XLARGE",
    );
  });

  it("プリセットが変化した場合はROOM_UPDATEで配信すること", () => {
    const room = createRoom({ fieldSizePreset: "MEDIUM" });
    const deps = createDeps({ room, gameManager: createGameManagerStub() });

    startGameCoordinator({
      ownerId: "socket-1",
      requestedFieldSizePreset: "XLARGE",
      ...deps,
      output: createOutputStub(),
    });

    expect(deps.roomOutput.publishRoomUpdateToRoom).toHaveBeenCalledWith(
      "room-1",
      expect.objectContaining({ fieldSizePreset: "XLARGE" }),
    );
  });

  it("プリセットが変化しない場合はROOM_UPDATEを配信しないこと", () => {
    const room = createRoom({ fieldSizePreset: "MEDIUM" });
    const deps = createDeps({ room, gameManager: createGameManagerStub() });

    startGameCoordinator({
      ownerId: "socket-1",
      requestedFieldSizePreset: "MEDIUM",
      ...deps,
      output: createOutputStub(),
    });

    expect(deps.roomOutput.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("プリセット反映がルーム未検出でもセッションは開始すること", () => {
    const gameManager = createGameManagerStub();

    startGameCoordinator({
      ownerId: "socket-1",
      requestedFieldSizePreset: "XLARGE",
      ...createDeps({
        room: createRoom({ fieldSizePreset: "MEDIUM" }),
        gameManager,
        canApplyFieldSizePreset: false,
      }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession.mock.calls[0]?.[2]).toEqual({
      fieldSizePreset: "XLARGE",
      gridCols: 54,
      gridRows: 54,
    });
  });

  it("開始受理時にプレイヤー数とプリセットを記録すること", () => {
    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({
        room: createRoom({ playerCount: 2 }),
        gameManager: createGameManagerStub(),
      }),
      output: createOutputStub(),
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.ACCEPTED,
      roomId: "room-1",
      socketId: "socket-1",
      totalPlayers: 2,
      fieldSizePreset: "MEDIUM",
    });
  });

  it("人数がチーム数の倍数でない場合はBotを補充すること", () => {
    const gameManager = createGameManagerStub();

    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({ room: createRoom({ playerCount: 1 }), gameManager }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession.mock.calls[0]?.[0]).toEqual([
      "socket-1",
      "bot:room-1:1",
      "bot:room-1:2",
      "bot:room-1:3",
    ]);
  });

  it("補充したBotの表示名をBOTにすること", () => {
    const gameManager = createGameManagerStub();

    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({ room: createRoom({ playerCount: 1 }), gameManager }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession.mock.calls[0]?.[1]).toEqual({
      "socket-1": "name-1",
      "bot:room-1:1": "BOT",
      "bot:room-1:2": "BOT",
      "bot:room-1:3": "BOT",
    });
  });

  it("人数がチーム数の倍数の場合はBotを補充しないこと", () => {
    const gameManager = createGameManagerStub();

    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({ room: createRoom({ playerCount: 4 }), gameManager }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession.mock.calls[0]?.[0]).toEqual([
      "socket-1",
      "socket-2",
      "socket-3",
      "socket-4",
    ]);
  });

  it("要求人数が指定された場合はその人数までBotを補充すること", () => {
    const gameManager = createGameManagerStub();

    startGameCoordinator({
      ownerId: "socket-1",
      requestedPlayerCount: 8,
      ...createDeps({ room: createRoom({ playerCount: 4 }), gameManager }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession.mock.calls[0]?.[0]).toHaveLength(8);
  });

  it("要求人数がチーム数の倍数でない場合は最小人数まで補充すること", () => {
    const gameManager = createGameManagerStub();

    startGameCoordinator({
      ownerId: "socket-1",
      requestedPlayerCount: 5,
      ...createDeps({ room: createRoom({ playerCount: 1 }), gameManager }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession.mock.calls[0]?.[0]).toHaveLength(4);
  });

  it("ゲームランタイムが解決できない場合はセッションを開始しないこと", () => {
    const output = createOutputStub();

    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({ room: createRoom(), gameManager: undefined }),
      output,
    });

    expect(output.publishGameStartToRoom).not.toHaveBeenCalled();
  });

  it("ゲームランタイムが解決できない場合はルームをwaitingへ戻すこと", () => {
    const deps = createDeps({ room: createRoom(), gameManager: undefined });

    startGameCoordinator({
      ownerId: "socket-1",
      ...deps,
      output: createOutputStub(),
    });

    expect(deps.roomManager.markRoomWaiting).toHaveBeenCalledWith("room-1");
  });

  it("ゲームランタイムが解決できない場合はignored_missing_runtimeを記録すること", () => {
    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({ room: createRoom(), gameManager: undefined }),
      output: createOutputStub(),
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.IGNORED_MISSING_RUNTIME,
      roomId: "room-1",
      socketId: "socket-1",
      rollbackStatus: "updated",
    });
  });

  it("ゲームランタイムが解決できない場合はacceptedを記録しないこと", () => {
    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({ room: createRoom(), gameManager: undefined }),
      output: createOutputStub(),
    });

    expect(logSpy).not.toHaveBeenCalledWith(
      `[${logScopes.GAME_USE_CASE}]`,
      expect.objectContaining({ result: logResults.ACCEPTED }),
    );
  });

  it("ロールバック成功時はwaiting復帰をROOM_UPDATEで配信すること", () => {
    const room = createRoom();
    const deps = createDeps({ room, gameManager: undefined });

    startGameCoordinator({
      ownerId: "socket-1",
      ...deps,
      output: createOutputStub(),
    });

    expect(deps.roomOutput.publishRoomUpdateToRoom).toHaveBeenCalledWith(
      "room-1",
      room,
    );
  });

  it("ロールバックがnot_foundの場合はrollbackStatusにnot_foundを記録すること", () => {
    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({
        room: createRoom(),
        rollbackResult: { status: "not_found" },
        gameManager: undefined,
      }),
      output: createOutputStub(),
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.IGNORED_MISSING_RUNTIME,
      roomId: "room-1",
      socketId: "socket-1",
      rollbackStatus: "not_found",
    });
  });

  it("ロールバックがnot_foundの場合はROOM_UPDATEを配信しないこと", () => {
    const deps = createDeps({
      room: createRoom(),
      rollbackResult: { status: "not_found" },
      gameManager: undefined,
    });

    startGameCoordinator({
      ownerId: "socket-1",
      ...deps,
      output: createOutputStub(),
    });

    expect(deps.roomOutput.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("ロールバックがinvalid_transitionの場合はrollbackStatusを記録すること", () => {
    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({
        room: createRoom(),
        rollbackResult: { status: "invalid_transition" },
        gameManager: undefined,
      }),
      output: createOutputStub(),
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.START_GAME,
      result: logResults.IGNORED_MISSING_RUNTIME,
      roomId: "room-1",
      socketId: "socket-1",
      rollbackStatus: "invalid_transition",
    });
  });

  it("ロールバックがinvalid_transitionの場合はROOM_UPDATEを配信しないこと", () => {
    const deps = createDeps({
      room: createRoom(),
      rollbackResult: { status: "invalid_transition" },
      gameManager: undefined,
    });

    startGameCoordinator({
      ownerId: "socket-1",
      ...deps,
      output: createOutputStub(),
    });

    expect(deps.roomOutput.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("ゲームランタイムが解決できない場合はプリセットを反映しないこと", () => {
    const deps = createDeps({ room: createRoom(), gameManager: undefined });

    startGameCoordinator({
      ownerId: "socket-1",
      requestedFieldSizePreset: "XLARGE",
      ...deps,
      output: createOutputStub(),
    });

    expect(deps.roomManager.applyFieldSizePreset).not.toHaveBeenCalled();
  });

  it("ランタイム未解決時は実ルーム管理でも状態がwaitingへ戻ること", () => {
    // Issue #291: playing のまま残ると以後のJOIN_ROOMが拒否され続けるため実体で検証する
    const roomManager = new RoomManager();
    roomManager.addPlayerToRoom("room-1", "socket-1", "name-1");

    startGameCoordinator({
      ownerId: "socket-1",
      roomManager,
      runtimeRegistry: {
        getGameManagerByRoomId: () => undefined,
        cleanupGameManagerForRoom: () => undefined,
      },
      output: createOutputStub(),
      roomOutput: {
        publishRoomUpdateToRoom: vi.fn(),
        closeRoomChannel: vi.fn(),
      },
    });

    expect(roomManager.getRoomById("room-1")?.status).toBe(
      domain.room.RoomPhase.WAITING,
    );
  });

  it("player_selectモードの場合は希望チームIDを渡すこと", () => {
    const gameManager = createGameManagerStub();

    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({
        room: createRoom({
          playerCount: 2,
          teamAssignmentMode: "player_select",
          preferredTeamIds: [1, null],
        }),
        gameManager,
      }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession.mock.calls[0]?.[4]).toEqual({
      "socket-1": 1,
      "socket-2": null,
    });
  });

  it("randomモードの場合は希望チームIDを渡さないこと", () => {
    const gameManager = createGameManagerStub();

    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({
        room: createRoom({ playerCount: 2, teamAssignmentMode: "random" }),
        gameManager,
      }),
      output: createOutputStub(),
    });

    expect(gameManager.startRoomSession.mock.calls[0]?.[4]).toBeUndefined();
  });

  it("経過msが未確定の場合は開始待機時間の負値で開始通知を送ること", () => {
    const output = createOutputStub();

    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({
        room: createRoom(),
        gameManager: createGameManagerStub(undefined),
      }),
      output,
    });

    expect(output.publishGameStartToRoom).toHaveBeenCalledWith("room-1", {
      roomId: "room-1",
      serverElapsedMs: -config.GAME_CONFIG.GAME_START_DELAY_MS,
      fieldSizePreset: "MEDIUM",
      gridCols: 36,
      gridRows: 36,
    });
  });

  it("セッションの符号付き経過msをそのまま開始通知へ載せること", () => {
    const output = createOutputStub();

    startGameCoordinator({
      ownerId: "socket-1",
      ...createDeps({
        room: createRoom(),
        gameManager: createGameManagerStub(-4_800),
      }),
      output,
    });

    expect(output.publishGameStartToRoom).toHaveBeenCalledWith(
      "room-1",
      expect.objectContaining({ serverElapsedMs: -4_800 }),
    );
  });

  it("セッション終了時にルーム削除とランタイム破棄を行うこと", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: createRoom(), gameManager });

    startGameCoordinator({
      ownerId: "socket-1",
      ...deps,
      output: createOutputStub(),
    });

    const callbacks = gameManager.startRoomSession.mock.calls[0]?.[3];
    callbacks?.onGameEnd({ rankings: [] });

    expect(deps.roomManager.deleteRoom).toHaveBeenCalledWith("room-1");
    expect(deps.runtimeRegistry.cleanupGameManagerForRoom).toHaveBeenCalledWith(
      "room-1",
    );
  });

  it("セッション終了時に対象ルームの配信チャンネルを閉じること", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: createRoom(), gameManager });

    startGameCoordinator({
      ownerId: "socket-1",
      ...deps,
      output: createOutputStub(),
    });

    const callbacks = gameManager.startRoomSession.mock.calls[0]?.[3];
    callbacks?.onGameEnd({ rankings: [] });

    expect(deps.roomOutput.closeRoomChannel.mock.calls).toEqual([["room-1"]]);
  });

  it("セッション終了前は配信チャンネルを閉じないこと", () => {
    const gameManager = createGameManagerStub();
    const deps = createDeps({ room: createRoom(), gameManager });

    startGameCoordinator({
      ownerId: "socket-1",
      ...deps,
      output: createOutputStub(),
    });

    expect(deps.roomOutput.closeRoomChannel).not.toHaveBeenCalled();
  });
});
