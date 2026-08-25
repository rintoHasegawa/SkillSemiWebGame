/**
 * disconnectCoordinator.test
 * DISCONNECT調停の現行挙動を固定する characterization test
 * ランタイム解決成否とBot置換有無による処理差，ルーム退出処理の実行順序を検証する
 */
import { domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  RoomDisconnectResult,
  RoomScopedGamePort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import { createRoom } from "@server/testing/roomFixtures";
import { disconnectCoordinator } from "./disconnectCoordinator";

/** ルーム単位ゲーム管理ポートを満たすスタブを生成する */
const createGameManagerStub = (replacedWithBot: boolean) => {
  return {
    startRoomSession: vi.fn<RoomScopedGamePort["startRoomSession"]>(),
    getRoomSignedElapsedMs: vi.fn<
      RoomScopedGamePort["getRoomSignedElapsedMs"]
    >(() => undefined),
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
    >(() => replacedWithBot),
  } satisfies RoomScopedGamePort;
};

type DisconnectDepsParams = {
  room?: domain.room.Room;
  gameManager?: RoomScopedGamePort;
  disconnectResult?: RoomDisconnectResult;
};

/** 切断調停で利用するルーム管理・ランタイム管理スタブを生成する */
const createDeps = ({
  room,
  gameManager,
  disconnectResult = { updatedRooms: [], deletedRoomIds: [] },
}: DisconnectDepsParams) => {
  return {
    roomManager: {
      getRoomByPlayerId: vi.fn<
        (playerId: string) => domain.room.Room | undefined
      >(() => room),
      getRoomById: vi.fn<(roomId: string) => domain.room.Room | undefined>(
        () => room,
      ),
      removePlayer: vi.fn<(socketId: string) => RoomDisconnectResult>(
        () => disconnectResult,
      ),
    },
    runtimeRegistry: {
      getGameManagerByPlayerId: vi.fn<
        (playerId: string) => RoomScopedGamePort | undefined
      >(() => gameManager),
      cleanupGameManagerForRoom: vi.fn<(roomId: string) => void>(),
    },
  };
};

/** 送信内容を記録する出力ポートスタブを生成する */
const createOutputStubs = () => {
  return {
    gameOutput: {
      publishPlayerRemovedToRoom: vi.fn<
        (roomId: string, removedPlayerId: string) => void
      >(),
    },
    roomOutput: {
      publishRoomUpdateToRoom: vi.fn<
        (roomId: string, room: domain.room.Room) => void
      >(),
    },
  };
};

let logSpy: ReturnType<typeof vi.spyOn>;

describe("disconnectCoordinator", () => {
  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ランタイム解決成功かつBot置換されない場合はゲーム管理からプレイヤーを削除すること", () => {
    const gameManager = createGameManagerStub(false);
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({ room: createRoom({ roomId: "room-1" }), gameManager }),
      gameOutput,
      roomOutput,
    });

    expect(gameManager.removePlayer).toHaveBeenCalledWith("socket-1");
  });

  it("Bot置換されない場合はルームへプレイヤー削除を通知すること", () => {
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({
        room: createRoom({ roomId: "room-1" }),
        gameManager: createGameManagerStub(false),
      }),
      gameOutput,
      roomOutput,
    });

    expect(gameOutput.publishPlayerRemovedToRoom).toHaveBeenCalledWith(
      "room-1",
      "socket-1",
    );
  });

  it("Bot置換された場合はゲーム管理からプレイヤーを削除しないこと", () => {
    const gameManager = createGameManagerStub(true);
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({ room: createRoom({ roomId: "room-1" }), gameManager }),
      gameOutput,
      roomOutput,
    });

    expect(gameManager.removePlayer).not.toHaveBeenCalled();
  });

  it("Bot置換された場合はプレイヤー削除を通知しないこと", () => {
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({
        room: createRoom({ roomId: "room-1" }),
        gameManager: createGameManagerStub(true),
      }),
      gameOutput,
      roomOutput,
    });

    expect(gameOutput.publishPlayerRemovedToRoom).not.toHaveBeenCalled();
  });

  it("ランタイムが解決できない場合はゲーム側の切断処理を行わないこと", () => {
    const gameManager = createGameManagerStub(false);
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({ room: createRoom({ roomId: "room-1" }), gameManager: undefined }),
      gameOutput,
      roomOutput,
    });

    expect(gameManager.replaceDisconnectedPlayerWithBot).not.toHaveBeenCalled();
    expect(gameOutput.publishPlayerRemovedToRoom).not.toHaveBeenCalled();
  });

  it("ルームが解決できない場合もBot引き継ぎ判定を実行すること", () => {
    const gameManager = createGameManagerStub(false);
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({ room: undefined, gameManager }),
      gameOutput,
      roomOutput,
    });

    expect(gameManager.replaceDisconnectedPlayerWithBot).toHaveBeenCalledWith(
      "socket-1",
    );
  });

  it("ルームが解決できない場合もゲーム管理からプレイヤーを削除すること", () => {
    const gameManager = createGameManagerStub(false);
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({ room: undefined, gameManager }),
      gameOutput,
      roomOutput,
    });

    expect(gameManager.removePlayer).toHaveBeenCalledWith("socket-1");
  });

  it("ルームが解決できない場合はプレイヤー削除を配信しないこと", () => {
    const gameManager = createGameManagerStub(false);
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({ room: undefined, gameManager }),
      gameOutput,
      roomOutput,
    });

    expect(gameOutput.publishPlayerRemovedToRoom).not.toHaveBeenCalled();
  });

  it("ルームが解決できない場合は配信先不明としてログを記録すること", () => {
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({
        room: undefined,
        gameManager: createGameManagerStub(false),
      }),
      gameOutput,
      roomOutput,
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.DISCONNECT,
      result: logResults.IGNORED_MISSING_ROOM,
      socketId: "socket-1",
    });
  });

  it("ルームが解決できた場合は配信先不明ログを記録しないこと", () => {
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({
        room: createRoom({ roomId: "room-1" }),
        gameManager: createGameManagerStub(false),
      }),
      gameOutput,
      roomOutput,
    });

    expect(logSpy).not.toHaveBeenCalledWith(
      `[${logScopes.GAME_USE_CASE}]`,
      expect.objectContaining({ result: logResults.IGNORED_MISSING_ROOM }),
    );
  });

  it("ルームが解決できずBot引き継ぎに成功した場合はプレイヤーを削除しないこと", () => {
    const gameManager = createGameManagerStub(true);
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({ room: undefined, gameManager }),
      gameOutput,
      roomOutput,
    });

    expect(gameManager.removePlayer).not.toHaveBeenCalled();
  });

  it("ランタイムが解決できない場合でもルーム退出処理を実行すること", () => {
    const deps = createDeps({ room: undefined, gameManager: undefined });
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...deps,
      gameOutput,
      roomOutput,
    });

    expect(deps.roomManager.removePlayer).toHaveBeenCalledWith("socket-1");
  });

  it("退出により更新されたルームごとにルーム更新を配信すること", () => {
    const updatedRoom = createRoom({ roomId: "room-1" });
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({
        room: undefined,
        gameManager: undefined,
        disconnectResult: {
          updatedRooms: [updatedRoom],
          deletedRoomIds: [],
        },
      }),
      gameOutput,
      roomOutput,
    });

    expect(roomOutput.publishRoomUpdateToRoom).toHaveBeenCalledWith(
      "room-1",
      updatedRoom,
    );
  });

  it("更新されたルームが無い場合はルーム更新を配信しないこと", () => {
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...createDeps({ room: undefined, gameManager: undefined }),
      gameOutput,
      roomOutput,
    });

    expect(roomOutput.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("削除されたルームIDごとにゲームランタイムを破棄すること", () => {
    const deps = createDeps({
      room: undefined,
      gameManager: undefined,
      disconnectResult: {
        updatedRooms: [],
        deletedRoomIds: ["room-1", "room-2"],
      },
    });
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...deps,
      gameOutput,
      roomOutput,
    });

    expect(deps.runtimeRegistry.cleanupGameManagerForRoom).toHaveBeenNthCalledWith(
      1,
      "room-1",
    );
    expect(deps.runtimeRegistry.cleanupGameManagerForRoom).toHaveBeenNthCalledWith(
      2,
      "room-2",
    );
  });

  it("ゲーム離脱処理をルーム退出処理より先に実行すること", () => {
    const gameManager = createGameManagerStub(false);
    const deps = createDeps({ room: createRoom({ roomId: "room-1" }), gameManager });
    const { gameOutput, roomOutput } = createOutputStubs();

    disconnectCoordinator({
      socketId: "socket-1",
      ...deps,
      gameOutput,
      roomOutput,
    });

    const gameRemoveOrder = gameManager.removePlayer.mock.invocationCallOrder[0];
    const roomRemoveOrder =
      deps.roomManager.removePlayer.mock.invocationCallOrder[0];
    expect(gameRemoveOrder).toBeLessThan(roomRemoveOrder ?? 0);
  });
});
