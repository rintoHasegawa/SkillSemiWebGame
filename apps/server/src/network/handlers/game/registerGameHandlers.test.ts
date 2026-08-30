/**
 * registerGameHandlers.test
 * ゲーム受信ハンドラ登録の現状挙動をそのまま固定する特性化テスト
 * イベント名・結び付くバリデータ・委譲先ハンドラ・ハンドラへ渡る引数を観測し，
 * 別イベントの正当ペイロードを投げるクロスマトリクスで定義の取り違えを検出する
 * 検証失敗時にクライアントへ拒否を通知しない（onInvalid を持たない）ことも固定する
 */
import type { Socket } from "socket.io";
import { config as sharedConfig, contracts as protocol } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_BOMB_ID_LENGTH } from "@server/domains/game/entities/bomb/bombPayloadValidation";
import type { RoomOutputPort } from "@server/domains/room/application/ports/roomUseCasePorts";
import { PlayerIdentityRegistry } from "@server/network/identity";
import type {
  GameEventRoomUseCasePort,
  GameEventRuntimeUseCasePort,
} from "@server/network/types/connectionPorts";
import { createGameOutputAdapterStub } from "@server/testing/gameOutputFixtures";
import {
  handleBombHitReportEvent,
  handleMoveEvent,
  handlePingEvent,
  handlePlaceBombEvent,
  handleReadyForGameEvent,
  handleStartGameEvent,
} from "./gameEventOrchestrators";
import { registerGameHandlers } from "./registerGameHandlers";

// 委譲先ハンドラは依存注入の継ぎ目を持たず，どの定義がどのハンドラへ結び付くかを
// 外から観測できないため，本ファイルに限りモジュール差し替えを用いる
// （.claude/rules/testing.md の「vi.mock は最終手段」に該当する例外）
// 型定数が壊れないよう importOriginal で実体を取り込み，調停関数のみ差し替える
vi.mock("./gameEventOrchestrators", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("./gameEventOrchestrators")>();

  return {
    ...actual,
    handlePingEvent: vi.fn<typeof actual.handlePingEvent>(),
    handleMoveEvent: vi.fn<typeof actual.handleMoveEvent>(),
    handlePlaceBombEvent: vi.fn<typeof actual.handlePlaceBombEvent>(),
    handleBombHitReportEvent: vi.fn<typeof actual.handleBombHitReportEvent>(),
    handleStartGameEvent: vi.fn<typeof actual.handleStartGameEvent>(),
    handleReadyForGameEvent: vi.fn<typeof actual.handleReadyForGameEvent>(),
  };
});

type EventListener = (payload: unknown) => void;

/** 受信リスナーと送信呼び出しを記録するソケットスタブを生成する */
const createSocketStub = (socketId: string) => {
  const listeners = new Map<string, EventListener>();
  const emit = vi.fn();
  const socket = {
    id: socketId,
    on: (event: string, listener: EventListener) => {
      listeners.set(event, listener);
    },
    once: vi.fn(),
    off: vi.fn(),
    emit,
    join: vi.fn(),
    leave: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as Socket;

  return { socket, emit, listeners };
};

/** ルーム状態配信を記録する出力スタブを生成する */
const createRoomOutputStub = () => {
  return {
    publishRoomUpdateToRoom: vi.fn<RoomOutputPort["publishRoomUpdateToRoom"]>(),
    closeRoomChannel: vi.fn<RoomOutputPort["closeRoomChannel"]>(),
  };
};

/** ゲームイベント調停で参照するルーム管理スタブを生成する */
const createRoomManagerStub = (): GameEventRoomUseCasePort => {
  return {
    getRoomByOwnerId: vi.fn<GameEventRoomUseCasePort["getRoomByOwnerId"]>(
      () => undefined,
    ),
    getRoomByPlayerId: vi.fn<GameEventRoomUseCasePort["getRoomByPlayerId"]>(
      () => undefined,
    ),
    markRoomPlaying: vi.fn<GameEventRoomUseCasePort["markRoomPlaying"]>(() => ({
      status: "not_found",
    })),
    markRoomWaiting: vi.fn<GameEventRoomUseCasePort["markRoomWaiting"]>(() => ({
      status: "not_found",
    })),
    applyFieldSizePreset: vi.fn<
      GameEventRoomUseCasePort["applyFieldSizePreset"]
    >(() => undefined),
    deleteRoom: vi.fn<GameEventRoomUseCasePort["deleteRoom"]>(() => false),
  };
};

/** ゲームイベント調停で参照するランタイム管理スタブを生成する */
const createRuntimeRegistryStub = (): GameEventRuntimeUseCasePort => {
  return {
    getGameManagerByRoomId: vi.fn<
      GameEventRuntimeUseCasePort["getGameManagerByRoomId"]
    >(() => undefined),
    getGameManagerByPlayerId: vi.fn<
      GameEventRuntimeUseCasePort["getGameManagerByPlayerId"]
    >(() => undefined),
    cleanupGameManagerForRoom: vi.fn<
      GameEventRuntimeUseCasePort["cleanupGameManagerForRoom"]
    >(),
  };
};

/** ハンドラ登録済みのソケットと依存スタブ一式を用意する */
const setupHandlers = (socketId: string = "socket-1") => {
  const { socket, emit, listeners } = createSocketStub(socketId);
  const roomManager = createRoomManagerStub();
  const runtimeRegistry = createRuntimeRegistryStub();
  const gameOutputAdapter = createGameOutputAdapterStub();
  const roomOutputAdapter = createRoomOutputStub();
  const identityRegistry = new PlayerIdentityRegistry();
  const sessionReservations = {
    releaseByRoomId: vi.fn<(roomId: string) => void>(),
  };

  registerGameHandlers({
    socket,
    roomManager,
    runtimeRegistry,
    gameOutputAdapter,
    roomOutputAdapter,
    identityRegistry,
    sessionReservations,
  });

  // 登録済みリスナーへ受信ペイロードを流し込む
  const receive = (event: string, payload: unknown) => {
    const listener = listeners.get(event);
    expect(listener).toBeDefined();
    listener?.(payload);
  };

  return {
    socket,
    emit,
    listeners,
    roomManager,
    runtimeRegistry,
    gameOutputAdapter,
    roomOutputAdapter,
    identityRegistry,
    sessionReservations,
    receive,
  };
};

const HANDLER_KEYS = [
  "ping",
  "move",
  "placeBomb",
  "bombHitReport",
  "startGame",
  "readyForGame",
] as const;

type HandlerKey = (typeof HANDLER_KEYS)[number];

const getHandlerMock = (key: HandlerKey) => {
  switch (key) {
    case "ping":
      return vi.mocked(handlePingEvent);
    case "move":
      return vi.mocked(handleMoveEvent);
    case "placeBomb":
      return vi.mocked(handlePlaceBombEvent);
    case "bombHitReport":
      return vi.mocked(handleBombHitReportEvent);
    case "startGame":
      return vi.mocked(handleStartGameEvent);
    case "readyForGame":
      return vi.mocked(handleReadyForGameEvent);
  }
};

// 指定したハンドラだけが1回呼ばれ，他の調停ハンドラは呼ばれていないことを確認する
const expectOnlyHandlerCalled = (expected: HandlerKey | undefined) => {
  for (const key of HANDLER_KEYS) {
    const handlerMock = getHandlerMock(key);
    if (key === expected) {
      expect(handlerMock).toHaveBeenCalledTimes(1);
      continue;
    }

    expect(handlerMock).not.toHaveBeenCalled();
  }
};

// 検証失敗時に拒否通知が出ないこと（onInvalid を持たないこと）を出力側から確認する
const expectNothingPublished = (setup: ReturnType<typeof setupHandlers>) => {
  for (const publish of Object.values(setup.gameOutputAdapter)) {
    expect(publish).not.toHaveBeenCalled();
  }

  for (const publish of Object.values(setup.roomOutputAdapter)) {
    expect(publish).not.toHaveBeenCalled();
  }

  expect(setup.emit).not.toHaveBeenCalled();
};

/** PINGの正当ペイロード（有限数値） */
const PING_PAYLOAD = 123;

/** MOVEの正当ペイロード（有限数値の x・y） */
const MOVE_PAYLOAD = { x: 1, y: 2 };

/** PLACE_BOMBの正当ペイロード（設置要求） */
const PLACE_BOMB_PAYLOAD = {
  requestId: "req-1",
  x: 3,
  y: 4,
  explodeAtElapsedMs: 5_000,
};

/** BOMB_HIT_REPORTの正当ペイロード（非空 bombId） */
const BOMB_HIT_REPORT_PAYLOAD = { bombId: "bomb-1" };

/** START_GAMEの正当ペイロード（各項目は省略可能） */
const START_GAME_PAYLOAD = {};

const MAX_EXPLODE_AT_ELAPSED_MS =
  sharedConfig.GAME_CONFIG.GAME_DURATION_SEC * 1_000
  + sharedConfig.GAME_CONFIG.BOMB_FUSE_MS;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("registerGameHandlers のイベント登録", () => {
  it("ゲーム受信イベント6種のリスナーだけを登録すること", () => {
    const setup = setupHandlers();

    expect([...setup.listeners.keys()].sort()).toEqual(
      [
        protocol.SocketEvents.PING,
        protocol.SocketEvents.MOVE,
        protocol.SocketEvents.PLACE_BOMB,
        protocol.SocketEvents.BOMB_HIT_REPORT,
        protocol.SocketEvents.START_GAME,
        protocol.SocketEvents.READY_FOR_GAME,
      ].sort(),
    );
  });

  it("登録直後はどの調停ハンドラも呼ばれないこと", () => {
    setupHandlers();

    expectOnlyHandlerCalled(undefined);
  });
});

describe("registerGameHandlers のバリデータ結び付き（クロスマトリクス）", () => {
  const crossMatrixCases = [
    {
      eventLabel: "PING",
      event: protocol.SocketEvents.PING,
      payloadLabel: "PINGの正当ペイロード",
      payload: PING_PAYLOAD,
      expectedHandler: "ping" as HandlerKey | undefined,
      expectation: "handlePingEvent だけが呼ばれること",
    },
    {
      eventLabel: "PING",
      event: protocol.SocketEvents.PING,
      payloadLabel: "MOVEの正当ペイロード",
      payload: MOVE_PAYLOAD,
      expectedHandler: undefined,
      expectation: "どの調停ハンドラも呼ばれないこと",
    },
    {
      eventLabel: "PING",
      event: protocol.SocketEvents.PING,
      payloadLabel: "PLACE_BOMBの正当ペイロード",
      payload: PLACE_BOMB_PAYLOAD,
      expectedHandler: undefined,
      expectation: "どの調停ハンドラも呼ばれないこと",
    },
    {
      eventLabel: "PING",
      event: protocol.SocketEvents.PING,
      payloadLabel: "BOMB_HIT_REPORTの正当ペイロード",
      payload: BOMB_HIT_REPORT_PAYLOAD,
      expectedHandler: undefined,
      expectation: "どの調停ハンドラも呼ばれないこと",
    },
    {
      eventLabel: "MOVE",
      event: protocol.SocketEvents.MOVE,
      payloadLabel: "MOVEの正当ペイロード",
      payload: MOVE_PAYLOAD,
      expectedHandler: "move" as HandlerKey | undefined,
      expectation: "handleMoveEvent だけが呼ばれること",
    },
    {
      eventLabel: "MOVE",
      event: protocol.SocketEvents.MOVE,
      payloadLabel: "PINGの正当ペイロード",
      payload: PING_PAYLOAD,
      expectedHandler: undefined,
      expectation: "どの調停ハンドラも呼ばれないこと",
    },
    {
      // isMovePayload は x・y のみを見るため，PLACE_BOMB形も現状は通過する
      eventLabel: "MOVE",
      event: protocol.SocketEvents.MOVE,
      payloadLabel: "PLACE_BOMBの正当ペイロード",
      payload: PLACE_BOMB_PAYLOAD,
      expectedHandler: "move" as HandlerKey | undefined,
      expectation: "handleMoveEvent だけが呼ばれること",
    },
    {
      eventLabel: "MOVE",
      event: protocol.SocketEvents.MOVE,
      payloadLabel: "BOMB_HIT_REPORTの正当ペイロード",
      payload: BOMB_HIT_REPORT_PAYLOAD,
      expectedHandler: undefined,
      expectation: "どの調停ハンドラも呼ばれないこと",
    },
    {
      eventLabel: "PLACE_BOMB",
      event: protocol.SocketEvents.PLACE_BOMB,
      payloadLabel: "PLACE_BOMBの正当ペイロード",
      payload: PLACE_BOMB_PAYLOAD,
      expectedHandler: "placeBomb" as HandlerKey | undefined,
      expectation: "handlePlaceBombEvent だけが呼ばれること",
    },
    {
      eventLabel: "PLACE_BOMB",
      event: protocol.SocketEvents.PLACE_BOMB,
      payloadLabel: "PINGの正当ペイロード",
      payload: PING_PAYLOAD,
      expectedHandler: undefined,
      expectation: "どの調停ハンドラも呼ばれないこと",
    },
    {
      eventLabel: "PLACE_BOMB",
      event: protocol.SocketEvents.PLACE_BOMB,
      payloadLabel: "MOVEの正当ペイロード",
      payload: MOVE_PAYLOAD,
      expectedHandler: undefined,
      expectation: "どの調停ハンドラも呼ばれないこと",
    },
    {
      eventLabel: "PLACE_BOMB",
      event: protocol.SocketEvents.PLACE_BOMB,
      payloadLabel: "BOMB_HIT_REPORTの正当ペイロード",
      payload: BOMB_HIT_REPORT_PAYLOAD,
      expectedHandler: undefined,
      expectation: "どの調停ハンドラも呼ばれないこと",
    },
    {
      eventLabel: "BOMB_HIT_REPORT",
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      payloadLabel: "BOMB_HIT_REPORTの正当ペイロード",
      payload: BOMB_HIT_REPORT_PAYLOAD,
      expectedHandler: "bombHitReport" as HandlerKey | undefined,
      expectation: "handleBombHitReportEvent だけが呼ばれること",
    },
    {
      eventLabel: "BOMB_HIT_REPORT",
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      payloadLabel: "PINGの正当ペイロード",
      payload: PING_PAYLOAD,
      expectedHandler: undefined,
      expectation: "どの調停ハンドラも呼ばれないこと",
    },
    {
      eventLabel: "BOMB_HIT_REPORT",
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      payloadLabel: "MOVEの正当ペイロード",
      payload: MOVE_PAYLOAD,
      expectedHandler: undefined,
      expectation: "どの調停ハンドラも呼ばれないこと",
    },
    {
      eventLabel: "BOMB_HIT_REPORT",
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      payloadLabel: "PLACE_BOMBの正当ペイロード",
      payload: PLACE_BOMB_PAYLOAD,
      expectedHandler: undefined,
      expectation: "どの調停ハンドラも呼ばれないこと",
    },
  ];

  it.each(crossMatrixCases)(
    "$eventLabel のリスナーが $payloadLabel を受け取ると $expectation",
    ({ event, payload, expectedHandler }) => {
      const setup = setupHandlers();

      setup.receive(event, payload);

      expectOnlyHandlerCalled(expectedHandler);
    },
  );
});

describe("registerGameHandlers の境界値検証", () => {
  const boundaryCases = [
    {
      eventLabel: "PING",
      event: protocol.SocketEvents.PING,
      payloadLabel: "0",
      payload: 0,
      expectedHandler: "ping" as HandlerKey | undefined,
      expectation: "処理されること",
    },
    {
      eventLabel: "PING",
      event: protocol.SocketEvents.PING,
      payloadLabel: "NaN",
      payload: Number.NaN,
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "PING",
      event: protocol.SocketEvents.PING,
      payloadLabel: "Infinity",
      payload: Number.POSITIVE_INFINITY,
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "PING",
      event: protocol.SocketEvents.PING,
      payloadLabel: "数値文字列",
      payload: "123",
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "PING",
      event: protocol.SocketEvents.PING,
      payloadLabel: "undefined",
      payload: undefined,
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "MOVE",
      event: protocol.SocketEvents.MOVE,
      payloadLabel: "原点座標",
      payload: { x: 0, y: 0 },
      expectedHandler: "move" as HandlerKey | undefined,
      expectation: "処理されること",
    },
    {
      eventLabel: "MOVE",
      event: protocol.SocketEvents.MOVE,
      payloadLabel: "負値の座標",
      payload: { x: -10.5, y: -20.5 },
      expectedHandler: "move" as HandlerKey | undefined,
      expectation: "処理されること",
    },
    {
      eventLabel: "MOVE",
      event: protocol.SocketEvents.MOVE,
      payloadLabel: "NaN を含む座標",
      payload: { x: Number.NaN, y: 0 },
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "MOVE",
      event: protocol.SocketEvents.MOVE,
      payloadLabel: "y が欠けた座標",
      payload: { x: 1 },
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "MOVE",
      event: protocol.SocketEvents.MOVE,
      payloadLabel: "配列",
      payload: [1, 2],
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "MOVE",
      event: protocol.SocketEvents.MOVE,
      payloadLabel: "null",
      payload: null,
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "PLACE_BOMB",
      event: protocol.SocketEvents.PLACE_BOMB,
      payloadLabel: "座標と爆発時刻が上限値のペイロード",
      payload: {
        requestId: "a".repeat(MAX_BOMB_ID_LENGTH),
        x: sharedConfig.MAX_FIELD_GRID_SIZE.cols,
        y: sharedConfig.MAX_FIELD_GRID_SIZE.rows,
        explodeAtElapsedMs: MAX_EXPLODE_AT_ELAPSED_MS,
      },
      expectedHandler: "placeBomb" as HandlerKey | undefined,
      expectation: "処理されること",
    },
    {
      eventLabel: "PLACE_BOMB",
      event: protocol.SocketEvents.PLACE_BOMB,
      payloadLabel: "x が上限超過のペイロード",
      payload: {
        requestId: "req-1",
        x: sharedConfig.MAX_FIELD_GRID_SIZE.cols + 1,
        y: 0,
        explodeAtElapsedMs: 0,
      },
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "PLACE_BOMB",
      event: protocol.SocketEvents.PLACE_BOMB,
      payloadLabel: "x が負値のペイロード",
      payload: {
        requestId: "req-1",
        x: -1,
        y: 0,
        explodeAtElapsedMs: 0,
      },
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "PLACE_BOMB",
      event: protocol.SocketEvents.PLACE_BOMB,
      payloadLabel: "requestId が最大長超過のペイロード",
      payload: {
        requestId: "a".repeat(MAX_BOMB_ID_LENGTH + 1),
        x: 0,
        y: 0,
        explodeAtElapsedMs: 0,
      },
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "PLACE_BOMB",
      event: protocol.SocketEvents.PLACE_BOMB,
      payloadLabel: "explodeAtElapsedMs が上限超過のペイロード",
      payload: {
        requestId: "req-1",
        x: 0,
        y: 0,
        explodeAtElapsedMs: MAX_EXPLODE_AT_ELAPSED_MS + 1,
      },
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "BOMB_HIT_REPORT",
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      payloadLabel: "最大長の bombId",
      payload: { bombId: "a".repeat(MAX_BOMB_ID_LENGTH) },
      expectedHandler: "bombHitReport" as HandlerKey | undefined,
      expectation: "処理されること",
    },
    {
      eventLabel: "BOMB_HIT_REPORT",
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      payloadLabel: "最大長超過の bombId",
      payload: { bombId: "a".repeat(MAX_BOMB_ID_LENGTH + 1) },
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "BOMB_HIT_REPORT",
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      payloadLabel: "空文字の bombId",
      payload: { bombId: "" },
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "BOMB_HIT_REPORT",
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      payloadLabel: "空白のみの bombId",
      payload: { bombId: "   " },
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
    {
      eventLabel: "BOMB_HIT_REPORT",
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      payloadLabel: "数値の bombId",
      payload: { bombId: 1 },
      expectedHandler: undefined,
      expectation: "処理されないこと",
    },
  ];

  it.each(boundaryCases)(
    "$eventLabel のリスナーへ $payloadLabel を渡すと $expectation",
    ({ event, payload, expectedHandler }) => {
      const setup = setupHandlers();

      setup.receive(event, payload);

      expectOnlyHandlerCalled(expectedHandler);
    },
  );
});

describe("registerGameHandlers のハンドラ引数", () => {
  it("共通の依存束をそのままハンドラの第1引数へ渡すこと", () => {
    const setup = setupHandlers();

    setup.receive(protocol.SocketEvents.PING, PING_PAYLOAD);

    const deps = vi.mocked(handlePingEvent).mock.calls[0][0];
    expect(deps.roomManager).toBe(setup.roomManager);
    expect(deps.runtimeRegistry).toBe(setup.runtimeRegistry);
    expect(deps.output).toBe(setup.gameOutputAdapter);
    expect(deps.roomOutput).toBe(setup.roomOutputAdapter);
    expect(deps.sessionReservations).toBe(setup.sessionReservations);
  });

  it("4イベントのハンドラが同一の依存束インスタンスを受け取ること", () => {
    const setup = setupHandlers();

    setup.receive(protocol.SocketEvents.PING, PING_PAYLOAD);
    setup.receive(protocol.SocketEvents.MOVE, MOVE_PAYLOAD);
    setup.receive(protocol.SocketEvents.PLACE_BOMB, PLACE_BOMB_PAYLOAD);
    setup.receive(
      protocol.SocketEvents.BOMB_HIT_REPORT,
      BOMB_HIT_REPORT_PAYLOAD,
    );

    const deps = vi.mocked(handlePingEvent).mock.calls[0][0];
    expect(vi.mocked(handleMoveEvent).mock.calls[0][0]).toBe(deps);
    expect(vi.mocked(handlePlaceBombEvent).mock.calls[0][0]).toBe(deps);
    expect(vi.mocked(handleBombHitReportEvent).mock.calls[0][0]).toBe(deps);
  });

  it("識別子が未登録のときは依存束の socketId がソケットIDになること", () => {
    const setup = setupHandlers("socket-1");

    setup.receive(protocol.SocketEvents.PING, PING_PAYLOAD);

    expect(vi.mocked(handlePingEvent).mock.calls[0][0].socketId).toBe(
      "socket-1",
    );
  });

  it("登録後に識別子が付け替わると依存束の socketId が追随すること", () => {
    const setup = setupHandlers("socket-1");
    setup.identityRegistry.bind("socket-1", "player-restored");

    setup.receive(protocol.SocketEvents.PING, PING_PAYLOAD);

    expect(vi.mocked(handlePingEvent).mock.calls[0][0].socketId).toBe(
      "player-restored",
    );
  });

  it("同じ依存束の socketId が参照のたびに再解決されること", () => {
    const setup = setupHandlers("socket-1");

    setup.receive(protocol.SocketEvents.PING, PING_PAYLOAD);
    const deps = vi.mocked(handlePingEvent).mock.calls[0][0];
    const beforeBind = deps.socketId;
    setup.identityRegistry.bind("socket-1", "player-restored");

    expect(beforeBind).toBe("socket-1");
    expect(deps.socketId).toBe("player-restored");
  });

  const payloadPassthroughCases = [
    {
      eventLabel: "PING",
      event: protocol.SocketEvents.PING,
      payload: PING_PAYLOAD as unknown,
      readCall: () => vi.mocked(handlePingEvent).mock.calls[0][1] as unknown,
    },
    {
      eventLabel: "MOVE",
      event: protocol.SocketEvents.MOVE,
      payload: MOVE_PAYLOAD as unknown,
      readCall: () => vi.mocked(handleMoveEvent).mock.calls[0][1] as unknown,
    },
    {
      eventLabel: "PLACE_BOMB",
      event: protocol.SocketEvents.PLACE_BOMB,
      payload: PLACE_BOMB_PAYLOAD as unknown,
      readCall: () =>
        vi.mocked(handlePlaceBombEvent).mock.calls[0][1] as unknown,
    },
    {
      eventLabel: "BOMB_HIT_REPORT",
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      payload: BOMB_HIT_REPORT_PAYLOAD as unknown,
      readCall: () =>
        vi.mocked(handleBombHitReportEvent).mock.calls[0][1] as unknown,
    },
  ];

  it.each(payloadPassthroughCases)(
    "$eventLabel の受信ペイロードを変換せずハンドラの第2引数へ渡すこと",
    ({ event, payload, readCall }) => {
      const setup = setupHandlers();

      setup.receive(event, payload);

      expect(readCall()).toBe(payload);
    },
  );

  it("ハンドラへ渡す引数が依存束とペイロードの2つだけであること", () => {
    const setup = setupHandlers();

    setup.receive(protocol.SocketEvents.MOVE, MOVE_PAYLOAD);

    expect(vi.mocked(handleMoveEvent).mock.calls[0]).toHaveLength(2);
  });
});

describe("registerGameHandlers の検証失敗時の扱い", () => {
  const invalidPayloadCases = [
    {
      eventLabel: "PING",
      event: protocol.SocketEvents.PING,
      payload: MOVE_PAYLOAD as unknown,
    },
    {
      eventLabel: "MOVE",
      event: protocol.SocketEvents.MOVE,
      payload: PING_PAYLOAD as unknown,
    },
    {
      eventLabel: "PLACE_BOMB",
      event: protocol.SocketEvents.PLACE_BOMB,
      payload: MOVE_PAYLOAD as unknown,
    },
    {
      eventLabel: "BOMB_HIT_REPORT",
      event: protocol.SocketEvents.BOMB_HIT_REPORT,
      payload: PING_PAYLOAD as unknown,
    },
  ];

  it.each(invalidPayloadCases)(
    "$eventLabel の検証失敗ではクライアントへ何も送信しないこと",
    ({ event, payload }) => {
      const setup = setupHandlers();

      setup.receive(event, payload);

      expectNothingPublished(setup);
    },
  );
});

describe("registerGameHandlers の他イベント", () => {
  it("START_GAME の正当ペイロードで handleStartGameEvent だけが呼ばれること", () => {
    const setup = setupHandlers();

    setup.receive(protocol.SocketEvents.START_GAME, START_GAME_PAYLOAD);

    expectOnlyHandlerCalled("startGame");
  });

  it("START_GAME の受信ペイロードを変換せずハンドラへ渡すこと", () => {
    const setup = setupHandlers();

    setup.receive(protocol.SocketEvents.START_GAME, START_GAME_PAYLOAD);

    expect(vi.mocked(handleStartGameEvent).mock.calls[0][1]).toBe(
      START_GAME_PAYLOAD,
    );
  });

  it("START_GAME の不正ペイロードでは調停ハンドラを呼ばないこと", () => {
    const setup = setupHandlers();

    setup.receive(protocol.SocketEvents.START_GAME, PING_PAYLOAD);

    expectOnlyHandlerCalled(undefined);
  });

  it("READY_FOR_GAME では handleReadyForGameEvent だけが呼ばれること", () => {
    const setup = setupHandlers();

    setup.receive(protocol.SocketEvents.READY_FOR_GAME, undefined);

    expectOnlyHandlerCalled("readyForGame");
  });

  it("READY_FOR_GAME はペイロードを検証せず依存束のみをハンドラへ渡すこと", () => {
    const setup = setupHandlers();

    setup.receive(protocol.SocketEvents.READY_FOR_GAME, "unexpected-payload");

    const deps = vi.mocked(handleReadyForGameEvent).mock.calls[0][0];
    expect(vi.mocked(handleReadyForGameEvent).mock.calls[0]).toHaveLength(1);
    expect(deps.roomManager).toBe(setup.roomManager);
  });
});
