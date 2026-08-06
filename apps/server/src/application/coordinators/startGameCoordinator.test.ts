/**
 * startGameCoordinator.test
 * START_GAME調停の現行挙動を固定する characterization test
 * ルーム未検出・状態遷移失敗の分岐，フィールド設定解決とBot補充，終了時の後始末を検証する
 */
import { domain } from "@repo/shared";
import type { FieldSizePreset } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StartGameOutputPort } from "@server/domains/game/application/ports/gameUseCasePorts";
import type {
  RoomPhaseTransitionResult,
  RoomScopedGamePort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import { startGameCoordinator } from "./startGameCoordinator";

const FIXED_NOW_MS = 1_700_000_000_000;

type RoomParams = {
  roomId?: string;
  playerCount?: number;
  fieldSizePreset?: FieldSizePreset;
  teamAssignmentMode?: domain.room.TeamAssignmentMode;
  preferredTeamIds?: (number | null)[];
};

/** テスト用のルーム状態を生成する */
const createRoom = ({
  roomId = "room-1",
  playerCount = 1,
  fieldSizePreset = "MEDIUM",
  teamAssignmentMode = "random",
  preferredTeamIds = [],
}: RoomParams = {}): domain.room.Room => {
  return {
    roomId,
    ownerId: "socket-1",
    players: Array.from({ length: playerCount }, (_, index) => ({
      id: `socket-${index + 1}`,
      name: `name-${index + 1}`,
      isOwner: index === 0,
      isReady: false,
      preferredTeamId: preferredTeamIds[index] ?? null,
    })),
    status: domain.room.RoomPhase.WAITING,
    maxPlayers: 100,
    fieldSizePreset,
    teamAssignmentMode,
  };
};

/** ルーム単位ゲーム管理ポートを満たすスタブを生成する */
const createGameManagerStub = (startTime?: number) => {
  return {
    startRoomSession: vi.fn<RoomScopedGamePort["startRoomSession"]>(),
    getRoomStartTime: vi.fn<RoomScopedGamePort["getRoomStartTime"]>(
      () => startTime,
    ),
    getRoomFieldConfig: vi.fn<RoomScopedGamePort["getRoomFieldConfig"]>(
      () => undefined,
    ),
    getRoomPlayers: vi.fn<RoomScopedGamePort["getRoomPlayers"]>(() => []),
    movePlayer: vi.fn<RoomScopedGamePort["movePlayer"]>(),
    shouldBroadcastBombPlaced: vi.fn<
      RoomScopedGamePort["shouldBroadcastBombPlaced"]
    >(() => true),
    issueServerBombId: vi.fn<RoomScopedGamePort["issueServerBombId"]>(
      () => "bomb-1",
    ),
    registerActiveBomb: vi.fn<RoomScopedGamePort["registerActiveBomb"]>(),
    getPlayerTeamId: vi.fn<RoomScopedGamePort["getPlayerTeamId"]>(() => 0),
    getActiveBombSnapshots: vi.fn<
      RoomScopedGamePort["getActiveBombSnapshots"]
    >(() => []),
    shouldBroadcastBombHitReport: vi.fn<
      RoomScopedGamePort["shouldBroadcastBombHitReport"]
    >(() => true),
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
  gameManager?: RoomScopedGamePort;
};

/** ルーム管理とランタイム管理のスタブを生成する */
const createDeps = ({
  room,
  transitionResult,
  gameManager,
}: DepsParams) => {
  const resolvedTransition: RoomPhaseTransitionResult =
    transitionResult ??
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
        () => resolvedTransition,
      ),
      deleteRoom: vi.fn<(roomId: string) => boolean>(() => true),
    },
    runtimeRegistry: {
      getGameManagerByRoomId: vi.fn<
        (roomId: string) => RoomScopedGamePort | undefined
      >(() => gameManager),
      cleanupGameManagerForRoom: vi.fn<(roomId: string) => void>(),
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
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW_MS);
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

  it("解決したプリセットをルーム状態へ書き戻すこと", () => {
    const room = createRoom({ fieldSizePreset: "MEDIUM" });

    startGameCoordinator({
      ownerId: "socket-1",
      requestedFieldSizePreset: "XLARGE",
      ...createDeps({ room, gameManager: createGameManagerStub() }),
      output: createOutputStub(),
    });

    expect(room.fieldSizePreset).toBe("XLARGE");
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

  it("ゲームランタイムが解決できない場合でもルームはplaying遷移済みであること", () => {
    const deps = createDeps({ room: createRoom(), gameManager: undefined });

    startGameCoordinator({
      ownerId: "socket-1",
      ...deps,
      output: createOutputStub(),
    });

    expect(deps.roomManager.markRoomPlaying).toHaveBeenCalledWith("room-1");
    expect(deps.roomManager.markRoomWaiting).not.toHaveBeenCalled();
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

  it("開始時刻が未設定の場合は現在時刻で開始通知を送ること", () => {
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
      startTime: FIXED_NOW_MS,
      serverNow: FIXED_NOW_MS,
      fieldSizePreset: "MEDIUM",
      gridCols: 36,
      gridRows: 36,
    });
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
});
