/**
 * GamePlayerOperationService.test
 * プレイヤー操作サービスの現行挙動を固定する characterization test
 * セッション未開始・非参加者の無視分岐と空室時のセッション破棄を検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Player } from "../../entities/player/Player";
import { GamePlayerOperationService } from "./GamePlayerOperationService";
import type { GameRoomSession } from "./GameRoomSession";

type SessionStubParams = {
  removed?: boolean;
  remainingPlayers?: Player[];
  promoted?: boolean;
};

/** セッション操作結果を固定した GameRoomSession スタブを生成する */
const createSessionStub = ({
  removed = true,
  remainingPlayers = [],
  promoted = true,
}: SessionStubParams = {}) => {
  return {
    movePlayer: vi.fn<(id: string, x: number, y: number) => void>(),
    removePlayer: vi.fn<(id: string) => boolean>(() => removed),
    getPlayers: vi.fn<() => Player[]>(() => remainingPlayers),
    dispose: vi.fn<() => void>(),
    promotePlayerToBotControl: vi.fn<(id: string) => boolean>(() => promoted),
  };
};

type ContextParams = SessionStubParams & {
  hasSession?: boolean;
  activePlayerIds?: string[];
};

/** サービスと注入済みスタブ一式を生成する */
const createContext = ({
  hasSession = true,
  activePlayerIds = ["socket-1"],
  ...sessionParams
}: ContextParams = {}) => {
  const session = createSessionStub(sessionParams);
  const sessionRef = {
    current: hasSession ? (session as unknown as GameRoomSession) : null,
  };
  const activeIds = new Set(activePlayerIds);

  return {
    session,
    sessionRef,
    activeIds,
    service: new GamePlayerOperationService(sessionRef, activeIds),
  };
};

describe("GamePlayerOperationService", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("セッション未開始の移動は無視すること", () => {
    const { session, service } = createContext({ hasSession: false });

    service.movePlayer("socket-1", 1, 2);

    expect(session.movePlayer).not.toHaveBeenCalled();
  });

  it("セッション未参加プレイヤーの移動は無視すること", () => {
    const { session, service } = createContext({ activePlayerIds: [] });

    service.movePlayer("socket-1", 1, 2);

    expect(session.movePlayer).not.toHaveBeenCalled();
  });

  it("参加中プレイヤーの移動はセッションへ委譲すること", () => {
    const { session, service } = createContext();

    service.movePlayer("socket-1", 1, 2);

    expect(session.movePlayer).toHaveBeenCalledWith("socket-1", 1, 2);
  });

  it("セッション未開始の削除は無視すること", () => {
    const { session, service } = createContext({ hasSession: false });

    service.removePlayer("socket-1");

    expect(session.removePlayer).not.toHaveBeenCalled();
  });

  it("セッション未参加プレイヤーの削除は無視すること", () => {
    const { session, service } = createContext({ activePlayerIds: [] });

    service.removePlayer("socket-1");

    expect(session.removePlayer).not.toHaveBeenCalled();
  });

  it("参加中プレイヤーの削除はセッションへ委譲すること", () => {
    const { session, service } = createContext();

    service.removePlayer("socket-1");

    expect(session.removePlayer).toHaveBeenCalledWith("socket-1");
  });

  it("削除したプレイヤーを参加者一覧から外すこと", () => {
    const { activeIds, service } = createContext({
      activePlayerIds: ["socket-1", "socket-2"],
      remainingPlayers: [{ id: "socket-2" } as Player],
    });

    service.removePlayer("socket-1");

    expect(activeIds.has("socket-1")).toBe(false);
  });

  it("プレイヤーが残っている場合はセッションを破棄しないこと", () => {
    const { session, service } = createContext({
      activePlayerIds: ["socket-1", "socket-2"],
      remainingPlayers: [{ id: "socket-2" } as Player],
    });

    service.removePlayer("socket-1");

    expect(session.dispose).not.toHaveBeenCalled();
  });

  it("最後のプレイヤー削除でセッションを破棄すること", () => {
    const { session, service } = createContext({ remainingPlayers: [] });

    service.removePlayer("socket-1");

    expect(session.dispose).toHaveBeenCalledTimes(1);
  });

  it("セッション破棄時はセッション参照をnullにすること", () => {
    const { sessionRef, service } = createContext({ remainingPlayers: [] });

    service.removePlayer("socket-1");

    expect(sessionRef.current).toBeNull();
  });

  it("セッション破棄時は参加者一覧を空にすること", () => {
    const { activeIds, service } = createContext({
      activePlayerIds: ["socket-1", "socket-2"],
      remainingPlayers: [],
    });

    service.removePlayer("socket-1");

    expect(activeIds.size).toBe(0);
  });

  it("セッション側で削除されなくても残存0人なら破棄すること", () => {
    const { session, service } = createContext({
      removed: false,
      remainingPlayers: [],
    });

    service.removePlayer("socket-1");

    expect(session.dispose).toHaveBeenCalledTimes(1);
  });

  it("セッション側で削除されなくても残存0人ならセッション参照をnullにすること", () => {
    const { sessionRef, service } = createContext({
      removed: false,
      remainingPlayers: [],
    });

    service.removePlayer("socket-1");

    expect(sessionRef.current).toBeNull();
  });

  it("セッション側で削除されなくても残存者がいれば破棄しないこと", () => {
    const { session, service } = createContext({
      removed: false,
      remainingPlayers: [{ id: "socket-2" } as Player],
    });

    service.removePlayer("socket-1");

    expect(session.dispose).not.toHaveBeenCalled();
  });

  it("セッション側で削除されなくても参加者一覧からは外すこと", () => {
    const { activeIds, service } = createContext({
      removed: false,
      remainingPlayers: [],
    });

    service.removePlayer("socket-1");

    expect(activeIds.has("socket-1")).toBe(false);
  });

  it("セッション未開始のBot引き継ぎはfalseを返すこと", () => {
    const { service } = createContext({ hasSession: false });

    expect(service.replaceDisconnectedPlayerWithBot("socket-1")).toBe(false);
  });

  it("セッション未参加プレイヤーのBot引き継ぎはfalseを返すこと", () => {
    const { service } = createContext({ activePlayerIds: [] });

    expect(service.replaceDisconnectedPlayerWithBot("socket-1")).toBe(false);
  });

  it("Bot引き継ぎ成功時はtrueを返すこと", () => {
    const { service } = createContext({ promoted: true });

    expect(service.replaceDisconnectedPlayerWithBot("socket-1")).toBe(true);
  });

  it("セッションが引き継ぎを拒否した場合はfalseを返すこと", () => {
    const { service } = createContext({ promoted: false });

    expect(service.replaceDisconnectedPlayerWithBot("socket-1")).toBe(false);
  });

  it("Bot引き継ぎでは参加者一覧から外さないこと", () => {
    const { activeIds, service } = createContext({ promoted: true });

    service.replaceDisconnectedPlayerWithBot("socket-1");

    expect(activeIds.has("socket-1")).toBe(true);
  });
});
