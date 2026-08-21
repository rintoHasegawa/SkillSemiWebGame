/**
 * GameSessionLifecycleService.test
 * セッションライフサイクル管理の現行挙動を固定する characterization test
 * セッション未開始時のフォールバック値と多重開始の抑止を検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Player } from "../../entities/player/Player";
import type {
  ActiveBombRegistration,
  ActiveBombSnapshot,
  GameFieldConfig,
} from "../ports/gameUseCasePorts";
import type { GameRoomSession, GameSessionCallbacks } from "./GameRoomSession";
import { GameSessionLifecycleService } from "./GameSessionLifecycleService";

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

  it("セッション未開始の被弾報告判定はfalseを返すこと", () => {
    const { service } = createContext(false);

    expect(service.shouldBroadcastBombHitReport("key", 0)).toBe(false);
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
