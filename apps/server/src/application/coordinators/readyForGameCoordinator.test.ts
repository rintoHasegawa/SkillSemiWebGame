/**
 * readyForGameCoordinator.test
 * READY_FOR_GAME調停の挙動を検証するユニットテスト
 * ランタイム解決成否によるユースケース入力の差を検証する
 * 開始通知は壁時計を載せず符号付きゲーム経過msのみを配信する
 */
import type { CurrentPlayersPayload, GameStartPayload } from "@repo/shared";
import { domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameFieldConfig } from "@server/domains/game/application/ports/gameUseCasePorts";
import type { RoomScopedGamePort } from "@server/domains/room/application/ports/roomUseCasePorts";
import { createRoom } from "@server/testing/roomFixtures";
import { createPlayerData } from "@server/testing/playerFixtures";
import { readyForGameCoordinator } from "./readyForGameCoordinator";

type GameManagerStubParams = {
  roomPlayers?: domain.game.player.PlayerData[];
  /** 進行中セッションの符号付きゲーム経過ms（未開始は undefined） */
  signedElapsedMs?: number;
  fieldConfig?: GameFieldConfig;
};

/** ルーム単位ゲーム管理ポートを満たすスタブを生成する */
const createGameManagerStub = ({
  roomPlayers = [],
  signedElapsedMs,
  fieldConfig,
}: GameManagerStubParams) => {
  return {
    startRoomSession: vi.fn<RoomScopedGamePort["startRoomSession"]>(),
    getRoomSignedElapsedMs: vi.fn<
      RoomScopedGamePort["getRoomSignedElapsedMs"]
    >(() => signedElapsedMs),
    getRoomFieldConfig: vi.fn<RoomScopedGamePort["getRoomFieldConfig"]>(
      () => fieldConfig,
    ),
    getRoomPlayers: vi.fn<RoomScopedGamePort["getRoomPlayers"]>(
      () => roomPlayers,
    ),
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
    demotePlayerFromBotControl: vi.fn<
      RoomScopedGamePort["demotePlayerFromBotControl"]
    >(() => true),
    getMapGridColorsView: vi.fn<
      RoomScopedGamePort["getMapGridColorsView"]
    >(() => []),
  } satisfies RoomScopedGamePort;
};

type GameManagerStub = ReturnType<typeof createGameManagerStub>;

/** 送信内容を記録する出力ポートスタブを生成する */
const createOutputStub = () => {
  return {
    publishCurrentPlayersToSocket: vi.fn<
      (players: CurrentPlayersPayload) => void
    >(),
    publishGameStartToSocket: vi.fn<(payload: GameStartPayload) => void>(),
    publishMapCellsToSocket: vi.fn<
      (cellUpdates: domain.game.gridMap.CellUpdate[]) => void
    >(),
  };
};

/** ルーム参照とランタイム参照の解決結果を固定した依存集合を生成する */
const createDeps = (
  room: domain.room.Room | undefined,
  gameManager: GameManagerStub | undefined,
) => {
  return {
    roomManager: {
      getRoomByPlayerId: vi.fn<
        (playerId: string) => domain.room.Room | undefined
      >(() => room),
    },
    runtimeRegistry: {
      getGameManagerByPlayerId: vi.fn<
        (playerId: string) => RoomScopedGamePort | undefined
      >(() => gameManager),
    },
  };
};

describe("readyForGameCoordinator", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ランタイム解決成功時はゲーム管理のプレイヤー一覧を通知すること", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayerData("socket-1", { x: 1.234_5, y: 2.345_6 })],
    });

    readyForGameCoordinator({
      socketId: "socket-1",
      ...createDeps(createRoom({ roomId: "room-1" }), gameManager),
      output,
    });

    expect(output.publishCurrentPlayersToSocket).toHaveBeenCalledWith([
      { id: "socket-1", name: "name-socket-1", teamId: 0, x: 1.23, y: 2.35 },
    ]);
  });

  it("開始済みの場合はセッションのフィールド設定で開始通知を送ること", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayerData("socket-1", { x: 1, y: 1 })],
      signedElapsedMs: 1_234,
      fieldConfig: { fieldSizePreset: "SMALL", gridCols: 24, gridRows: 24 },
    });

    readyForGameCoordinator({
      socketId: "socket-1",
      ...createDeps(createRoom({ roomId: "room-1" }), gameManager),
      output,
    });

    expect(output.publishGameStartToSocket).toHaveBeenCalledWith({
      roomId: "room-1",
      serverElapsedMs: 1_234,
      fieldSizePreset: "SMALL",
      gridCols: 24,
      gridRows: 24,
    });
  });

  it("ルームが解決できない場合は空のプレイヤー一覧を通知すること", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayerData("socket-1", { x: 1, y: 1 })],
    });

    readyForGameCoordinator({
      socketId: "socket-1",
      ...createDeps(undefined, gameManager),
      output,
    });

    expect(output.publishCurrentPlayersToSocket).toHaveBeenCalledWith([]);
  });

  it("ルームが解決できない場合はゲーム管理を参照しないこと", () => {
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayerData("socket-1", { x: 1, y: 1 })],
    });

    readyForGameCoordinator({
      socketId: "socket-1",
      ...createDeps(undefined, gameManager),
      output: createOutputStub(),
    });

    expect(gameManager.getRoomPlayers).not.toHaveBeenCalled();
  });

  it("ランタイムが解決できない場合は空のプレイヤー一覧を通知すること", () => {
    const output = createOutputStub();

    readyForGameCoordinator({
      socketId: "socket-1",
      ...createDeps(createRoom({ roomId: "room-1" }), undefined),
      output,
    });

    expect(output.publishCurrentPlayersToSocket).toHaveBeenCalledWith([]);
  });

  it("ランタイムが解決できない場合は開始通知を送らないこと", () => {
    const output = createOutputStub();

    readyForGameCoordinator({
      socketId: "socket-1",
      ...createDeps(createRoom({ roomId: "room-1" }), undefined),
      output,
    });

    expect(output.publishGameStartToSocket).not.toHaveBeenCalled();
  });

  it("ランタイム解決に受け取ったsocketIdを使用すること", () => {
    const deps = createDeps(
      createRoom({ roomId: "room-1" }),
      createGameManagerStub({ roomPlayers: [] }),
    );

    readyForGameCoordinator({
      socketId: "socket-42",
      ...deps,
      output: createOutputStub(),
    });

    expect(deps.roomManager.getRoomByPlayerId).toHaveBeenCalledWith("socket-42");
    expect(deps.runtimeRegistry.getGameManagerByPlayerId).toHaveBeenCalledWith(
      "socket-42",
    );
  });
});
