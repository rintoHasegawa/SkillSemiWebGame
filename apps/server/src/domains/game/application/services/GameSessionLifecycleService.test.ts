/**
 * GameSessionLifecycleService.test
 * セッションライフサイクル管理の仕様を検証するテスト
 * セッション未開始時のフォールバック値・多重開始の抑止・
 * セッション生成ファクトリの注入とonGameEndラッパーを検証する
 */
import type { GameResultPayload } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config } from "@server/config";

import type { Player } from "../../entities/player/Player";
import type {
  ActiveBombRegistration,
  ActiveBombSnapshot,
  GameFieldConfig,
} from "../ports/gameUseCasePorts";
import type { GameRoomSession, GameSessionCallbacks } from "./GameRoomSession";
import {
  GameSessionLifecycleService,
  type GameRoomSessionFactory,
} from "./GameSessionLifecycleService";

const fieldConfig: GameFieldConfig = {
  fieldSizePreset: "SMALL",
  gridCols: 6,
  gridRows: 6,
};

/** セッション参照値を固定した GameRoomSession スタブを生成する */
const createSessionStub = () => {
  return {
    getStartTime: vi.fn<() => number | undefined>(() => 1_234),
    getPlayers: vi.fn<() => Player[]>(() => [{ id: "socket-1" } as Player]),
    getFieldConfig: vi.fn<() => GameFieldConfig>(() => fieldConfig),
    shouldBroadcastBombPlaced: vi.fn<
      (dedupeKey: string, nowMs: number) => boolean
    >(() => true),
    shouldBroadcastBombHitReport: vi.fn<
      (dedupeKey: string, nowMs: number) => boolean
    >(() => true),
    isSameTeamBombHitReport: vi.fn<
      (reporterPlayerId: string, bombId: string) => boolean
    >(() => true),
    shouldAcceptBombPlacement: vi.fn<
      (playerId: string, nowMs: number) => boolean
    >(() => true),
    issueServerBombId: vi.fn<() => string>(() => "bomb-1"),
    getPlayerTeamId: vi.fn<(playerId: string) => number>(() => 3),
    registerActiveBomb: vi.fn<
      (registration: ActiveBombRegistration) => void
    >(),
    recordBombHitForOwner: vi.fn<(bombId: string) => void>(),
    getActiveBombSnapshots: vi.fn<() => ActiveBombSnapshot[]>(() => []),
    dispose: vi.fn<() => void>(),
  };
};

/** セッション有無を指定してサービスを生成する */
const createContext = (hasSession: boolean) => {
  const session = createSessionStub();
  const sessionRef = {
    current: hasSession ? (session as unknown as GameRoomSession) : null,
  };
  const activePlayerIds = new Set<string>(hasSession ? ["socket-1"] : []);

  return {
    session,
    sessionRef,
    activePlayerIds,
    service: new GameSessionLifecycleService(
      sessionRef,
      activePlayerIds,
      "room-1",
    ),
  };
};

/** startRoomSession 用のコールバックスタブを生成する */
const createCallbacksStub = (): GameSessionCallbacks => {
  return {
    onTick: vi.fn(),
    onGameEnd: vi.fn(),
  };
};

describe("GameSessionLifecycleService", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("セッション未開始の開始時刻はundefinedを返すこと", () => {
    const { service } = createContext(false);

    expect(service.getRoomStartTime()).toBeUndefined();
  });

  it("セッション開始済みの場合は開始時刻を返すこと", () => {
    const { service } = createContext(true);

    expect(service.getRoomStartTime()).toBe(1_234);
  });

  it("セッション未開始のプレイヤー一覧は空配列を返すこと", () => {
    const { service } = createContext(false);

    expect(service.getRoomPlayers()).toEqual([]);
  });

  it("セッション未開始のフィールド設定はundefinedを返すこと", () => {
    const { service } = createContext(false);

    expect(service.getRoomFieldConfig()).toBeUndefined();
  });

  it("セッション開始済みのフィールド設定を返すこと", () => {
    const { service } = createContext(true);

    expect(service.getRoomFieldConfig()).toEqual(fieldConfig);
  });

  it("セッション未開始の爆弾配信判定はfalseを返すこと", () => {
    const { service } = createContext(false);

    expect(service.shouldBroadcastBombPlaced("key", 0)).toBe(false);
  });

  it("セッション未開始の爆弾設置受理判定はfalseを返すこと", () => {
    const { service } = createContext(false);

    expect(service.shouldAcceptBombPlacement("socket-1", 0)).toBe(false);
  });

  it("セッション開始後の爆弾設置受理判定はセッションへ委譲すること", () => {
    const { service, session } = createContext(true);

    expect(service.shouldAcceptBombPlacement("socket-1", 1_000)).toBe(true);
    expect(session.shouldAcceptBombPlacement).toHaveBeenCalledWith(
      "socket-1",
      1_000,
    );
  });

  it("セッション未開始の被弾報告判定はfalseを返すこと", () => {
    const { service } = createContext(false);

    expect(service.shouldBroadcastBombHitReport("key", 0)).toBe(false);
  });

  it("セッション未開始の同チーム被弾報告判定はfalseを返すこと", () => {
    const { service } = createContext(false);

    expect(service.isSameTeamBombHitReport("socket-1", "bomb-1")).toBe(false);
  });

  it("セッション開始済みの同チーム被弾報告判定をセッションへ委譲すること", () => {
    const { session, service } = createContext(true);

    expect(service.isSameTeamBombHitReport("socket-1", "bomb-1")).toBe(true);
    expect(session.isSameTeamBombHitReport).toHaveBeenCalledWith(
      "socket-1",
      "bomb-1",
    );
  });

  it("セッション未開始の爆弾ID採番はundefinedを返すこと", () => {
    const { service } = createContext(false);

    expect(service.issueServerBombId()).toBeUndefined();
  });

  it("セッション未開始の爆弾ID採番は例外を投げないこと", () => {
    const { service } = createContext(false);

    expect(() => service.issueServerBombId()).not.toThrow();
  });

  it("セッション開始済みの爆弾ID採番はセッション値を返すこと", () => {
    const { service } = createContext(true);

    expect(service.issueServerBombId()).toBe("bomb-1");
  });

  it("セッション未開始のチームID取得は-1を返すこと", () => {
    const { service } = createContext(false);

    expect(service.getPlayerTeamId("socket-1")).toBe(-1);
  });

  it("セッション開始済みのチームIDを返すこと", () => {
    const { service } = createContext(true);

    expect(service.getPlayerTeamId("socket-1")).toBe(3);
  });

  it("セッション未開始の爆弾登録は何もしないこと", () => {
    const { session, service } = createContext(false);

    service.registerActiveBomb({
      bombId: "bomb-1",
      ownerPlayerId: "socket-1",
      x: 1,
      y: 1,
      explodeAtElapsedMs: 100,
    });

    expect(session.registerActiveBomb).not.toHaveBeenCalled();
  });

  it("セッション未開始の被弾スタッツ更新は何もしないこと", () => {
    const { session, service } = createContext(false);

    service.recordBombHitForOwner("bomb-1");

    expect(session.recordBombHitForOwner).not.toHaveBeenCalled();
  });

  it("セッション未開始のアクティブ爆弾一覧は空配列を返すこと", () => {
    const { service } = createContext(false);

    expect(service.getActiveBombSnapshots()).toEqual([]);
  });

  it("セッション開始済みの場合は多重開始を無視すること", () => {
    const { sessionRef, service } = createContext(true);
    const before = sessionRef.current;

    service.startRoomSession(
      ["socket-2"],
      {},
      fieldConfig,
      createCallbacksStub(),
    );

    expect(sessionRef.current).toBe(before);
  });

  it("多重開始時は参加者一覧を書き換えないこと", () => {
    const { activePlayerIds, service } = createContext(true);

    service.startRoomSession(
      ["socket-2"],
      {},
      fieldConfig,
      createCallbacksStub(),
    );

    expect(Array.from(activePlayerIds)).toEqual(["socket-1"]);
  });

  it("セッション未開始の場合は新規セッションを生成すること", () => {
    const { sessionRef, service } = createContext(false);

    service.startRoomSession(
      ["socket-1"],
      { "socket-1": "太郎" },
      fieldConfig,
      createCallbacksStub(),
    );

    expect(sessionRef.current).not.toBeNull();
    service.dispose();
  });

  it("セッション開始時は参加者一覧を渡されたIDで再構築すること", () => {
    const { activePlayerIds, service } = createContext(false);
    activePlayerIds.add("socket-old");

    service.startRoomSession(
      ["socket-1", "socket-2"],
      {},
      fieldConfig,
      createCallbacksStub(),
    );

    expect(Array.from(activePlayerIds)).toEqual(["socket-1", "socket-2"]);
    service.dispose();
  });

  it("破棄時はセッションのdisposeを呼ぶこと", () => {
    const { session, service } = createContext(true);

    service.dispose();

    expect(session.dispose).toHaveBeenCalledTimes(1);
  });

  it("破棄時はセッション参照をnullにすること", () => {
    const { sessionRef, service } = createContext(true);

    service.dispose();

    expect(sessionRef.current).toBeNull();
  });

  it("破棄時は参加者一覧を空にすること", () => {
    const { activePlayerIds, service } = createContext(true);

    service.dispose();

    expect(activePlayerIds.size).toBe(0);
  });

  it("セッション未開始の破棄でも例外を投げないこと", () => {
    const { service } = createContext(false);

    expect(() => service.dispose()).not.toThrow();
  });
});

/** start と dispose を記録するセッションスタブを生成する */
const createStartableSessionStub = () => {
  return {
    ...createSessionStub(),
    start: vi.fn<(tickRate: number, callbacks: GameSessionCallbacks) => void>(),
  };
};

/** ファクトリを注入したサービスと記録用スタブを生成する */
const createFactoryContext = () => {
  const session = createStartableSessionStub();
  const createSession = vi.fn<GameRoomSessionFactory>(
    () => session as unknown as GameRoomSession,
  );
  const sessionRef = { current: null as GameRoomSession | null };
  const activePlayerIds = new Set<string>();
  const callbacks = createCallbacksStub();

  return {
    session,
    createSession,
    sessionRef,
    activePlayerIds,
    callbacks,
    service: new GameSessionLifecycleService(
      sessionRef,
      activePlayerIds,
      "room-1",
      createSession,
    ),
  };
};

/** セッションへ渡された onGameEnd ラッパーを取り出す */
const getWrappedOnGameEnd = (
  session: ReturnType<typeof createStartableSessionStub>,
): ((payload: GameResultPayload) => void) => {
  const wrapped = session.start.mock.calls[0]?.[1].onGameEnd;
  if (!wrapped) {
    throw new Error("onGameEnd が渡されていない");
  }

  return wrapped;
};

const gameResultPayload: GameResultPayload = {
  rankings: [],
  finalGridColors: [],
  playerStats: [],
};

describe("GameSessionLifecycleService.startRoomSession のセッション生成", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ファクトリへルームIDと参加者情報を渡すこと", () => {
    const { createSession, service, callbacks } = createFactoryContext();

    service.startRoomSession(
      ["socket-1"],
      { "socket-1": "太郎" },
      fieldConfig,
      callbacks,
      { "socket-1": 2 },
    );

    expect(createSession).toHaveBeenCalledWith({
      roomId: "room-1",
      playerIds: ["socket-1"],
      playerNamesById: { "socket-1": "太郎" },
      fieldConfig,
      teamPreferences: { "socket-1": 2 },
    });
  });

  it("チーム希望を省略した場合はundefinedのまま渡すこと", () => {
    const { createSession, service, callbacks } = createFactoryContext();

    service.startRoomSession(["socket-1"], {}, fieldConfig, callbacks);

    expect(createSession).toHaveBeenCalledWith({
      roomId: "room-1",
      playerIds: ["socket-1"],
      playerNamesById: {},
      fieldConfig,
      teamPreferences: undefined,
    });
  });

  it("ファクトリが生成したセッションを参照へ保持すること", () => {
    const { session, sessionRef, service, callbacks } = createFactoryContext();

    service.startRoomSession(["socket-1"], {}, fieldConfig, callbacks);

    expect(sessionRef.current).toBe(session as unknown as GameRoomSession);
  });

  it("設定値のtick間隔でセッションを開始すること", () => {
    const { session, service, callbacks } = createFactoryContext();

    service.startRoomSession(["socket-1"], {}, fieldConfig, callbacks);

    expect(session.start.mock.calls[0]?.[0]).toBe(
      config.GAME_CONFIG.NETWORK_SYNC.PLAYER_POSITION_UPDATE_MS,
    );
  });

  it("onTickコールバックはそのままセッションへ渡すこと", () => {
    const { session, service, callbacks } = createFactoryContext();

    service.startRoomSession(["socket-1"], {}, fieldConfig, callbacks);

    expect(session.start.mock.calls[0]?.[1].onTick).toBe(callbacks.onTick);
  });

  it("多重開始の場合はファクトリを呼ばないこと", () => {
    const { createSession, sessionRef, session, service, callbacks } =
      createFactoryContext();
    sessionRef.current = session as unknown as GameRoomSession;

    service.startRoomSession(["socket-1"], {}, fieldConfig, callbacks);

    expect(createSession).not.toHaveBeenCalled();
  });
});

describe("GameSessionLifecycleService のonGameEndラッパー", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ゲーム終了時に参加者一覧を空にすること", () => {
    const { session, activePlayerIds, service, callbacks } =
      createFactoryContext();
    service.startRoomSession(["socket-1"], {}, fieldConfig, callbacks);

    getWrappedOnGameEnd(session)(gameResultPayload);

    expect(activePlayerIds.size).toBe(0);
  });

  it("ゲーム終了時にセッション参照をnullにすること", () => {
    const { session, sessionRef, service, callbacks } = createFactoryContext();
    service.startRoomSession(["socket-1"], {}, fieldConfig, callbacks);

    getWrappedOnGameEnd(session)(gameResultPayload);

    expect(sessionRef.current).toBeNull();
  });

  it("ゲーム終了時に元のコールバックへ結果を渡すこと", () => {
    const { session, service, callbacks } = createFactoryContext();
    service.startRoomSession(["socket-1"], {}, fieldConfig, callbacks);

    getWrappedOnGameEnd(session)(gameResultPayload);

    expect(callbacks.onGameEnd).toHaveBeenCalledWith(gameResultPayload);
  });

  it("ゲーム終了通知の前に参加者一覧を空にすること", () => {
    const { session, activePlayerIds, service } = createFactoryContext();
    const observedSizes: number[] = [];
    const callbacks: GameSessionCallbacks = {
      onTick: vi.fn(),
      onGameEnd: vi.fn(() => {
        observedSizes.push(activePlayerIds.size);
      }),
    };
    service.startRoomSession(["socket-1"], {}, fieldConfig, callbacks);

    getWrappedOnGameEnd(session)(gameResultPayload);

    expect(observedSizes).toEqual([0]);
  });
});
