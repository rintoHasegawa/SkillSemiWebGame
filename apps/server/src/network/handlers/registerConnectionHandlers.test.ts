/**
 * registerConnectionHandlers.test
 * 接続・切断ハンドラ登録の仕様を検証するテスト
 * 切断時に復帰用のセッション予約を残す条件（トークン提示・Bot置換成功・
 * ゲーム進行中）と，識別子の解放を対象とする
 */
import type { Server, Socket } from "socket.io";
import { contracts as protocol, domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  RoomDisconnectResult,
  RoomScopedGamePort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import {
  PlayerIdentityRegistry,
  SessionReservationRegistry,
} from "@server/network/identity";
import type {
  SocketConnectionRoomPort,
  SocketConnectionRuntimePort,
} from "@server/network/types/connectionPorts";
import { createRoomScopedGamePortStub } from "@server/testing/gamePortFixtures";
import { createRoom, createRoomMember } from "@server/testing/roomFixtures";
import { registerConnectionHandlers } from "./registerConnectionHandlers";

type EventListener = (payload?: unknown) => void;

/** 接続ハンドラ登録に渡す Socket.IO サーバスタブを生成する */
const createIoStub = () => {
  const connectListeners: ((socket: Socket) => void)[] = [];
  const io = {
    on: (event: string, listener: (socket: Socket) => void) => {
      if (event === protocol.SocketEvents.CONNECT) {
        connectListeners.push(listener);
      }
    },
    to: vi.fn(() => ({ emit: vi.fn(), except: vi.fn(() => ({ emit: vi.fn() })) })),
    in: vi.fn(() => ({ socketsLeave: vi.fn() })),
  } as unknown as Server;

  return { io, connectListeners };
};

/** ハンドシェイクとリスナー登録を記録するソケットスタブを生成する */
const createSocketStub = (socketId: string, sessionToken?: unknown) => {
  const listeners = new Map<string, EventListener>();
  const socket = {
    id: socketId,
    handshake: { auth: sessionToken === undefined ? {} : { sessionToken } },
    on: (event: string, listener: EventListener) => {
      listeners.set(event, listener);
    },
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    join: vi.fn(async () => undefined),
    leave: vi.fn(async () => undefined),
    disconnect: vi.fn(),
  } as unknown as Socket;

  return { socket, listeners };
};

type ManagerStubParams = {
  /** 切断プレイヤーが所属するルーム（未指定なら所属なし） */
  room?: domain.room.Room;
  /** ゲームランタイムを解決できるか（ロビー中はfalse） */
  hasGameManager?: boolean;
  /** Bot置換が成功するか */
  replacedWithBot?: boolean;
  teamId?: number;
};

/** ルーム管理・ランタイム管理のスタブを生成する */
const createManagerStubs = ({
  room,
  hasGameManager = true,
  replacedWithBot = true,
  teamId = 2,
}: ManagerStubParams = {}) => {
  const gameManager: RoomScopedGamePort = createRoomScopedGamePortStub({
    replaceDisconnectedPlayerWithBot: vi.fn(() => replacedWithBot),
    getPlayerTeamId: vi.fn(() => teamId),
  });

  const roomManager = {
    addPlayerToRoom: vi.fn(() => ({ room: createRoom(), status: "joined" as const })),
    getRoomByOwnerId: vi.fn(() => undefined),
    getRoomByPlayerId: vi.fn(() => room),
    markRoomPlaying: vi.fn(() => ({ status: "not_found" as const })),
    markRoomWaiting: vi.fn(() => ({ status: "not_found" as const })),
    removePlayer: vi.fn<(socketId: string) => RoomDisconnectResult>(() => ({
      updatedRooms: [],
      deletedRoomIds: [],
    })),
    restorePlayerToRoom: vi.fn(() => ({ status: "not_found" as const })),
    getRoomById: vi.fn(() => room),
    deleteRoom: vi.fn(() => true),
    updateLobbySettings: vi.fn(() => undefined),
    applyFieldSizePreset: vi.fn(() => undefined),
    selectTeam: vi.fn(() => ({ status: "not_found" as const })),
  } satisfies SocketConnectionRoomPort;

  const runtimeRegistry = {
    ensureGameManagerForRoom: vi.fn(),
    getGameManagerByRoomId: vi.fn(() =>
      hasGameManager ? gameManager : undefined,
    ),
    getGameManagerByPlayerId: vi.fn(() =>
      hasGameManager ? gameManager : undefined,
    ),
    cleanupGameManagerForRoom: vi.fn(),
  } satisfies SocketConnectionRuntimePort;

  return { roomManager, runtimeRegistry, gameManager };
};

type SetupParams = ManagerStubParams & {
  socketId?: string;
  sessionToken?: unknown;
};

/** 接続ハンドラを登録し，接続済みソケットと依存を返す */
const setupConnection = ({
  socketId = "socket-1",
  sessionToken,
  ...managerParams
}: SetupParams = {}) => {
  const { io, connectListeners } = createIoStub();
  const { roomManager, runtimeRegistry, gameManager } =
    createManagerStubs(managerParams);
  const identityRegistry = new PlayerIdentityRegistry();
  const sessionReservations = new SessionReservationRegistry();
  // 予約を作ったか自体を検証するため，登録操作を記録する
  const reserveSpy = vi.spyOn(sessionReservations, "reserve");

  registerConnectionHandlers({
    io,
    roomManager,
    runtimeRegistry,
    identityRegistry,
    sessionReservations,
  });

  const { socket, listeners } = createSocketStub(socketId, sessionToken);
  connectListeners.forEach((listener) => {
    listener(socket);
  });

  /** 切断イベントを発火する */
  const disconnect = () => {
    listeners.get(protocol.SocketEvents.DISCONNECT)?.();
  };

  return {
    socket,
    listeners,
    disconnect,
    roomManager,
    runtimeRegistry,
    gameManager,
    identityRegistry,
    sessionReservations,
    reserveSpy,
  };
};

/** ゲーム進行中に在籍しているルームを生成する */
const createPlayingRoom = (playerId = "socket-1") => {
  return createRoom({
    status: domain.room.RoomPhase.PLAYING,
    players: [createRoomMember({ id: playerId, name: "太郎" })],
  });
};

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("registerConnectionHandlers", () => {
  it("接続時に切断イベントの受信を登録すること", () => {
    const { listeners } = setupConnection();

    expect(listeners.has(protocol.SocketEvents.DISCONNECT)).toBe(true);
  });

  it("ゲーム進行中の切断でBot置換に成功した場合は復帰予約を残すこと", () => {
    const { disconnect, sessionReservations } = setupConnection({
      sessionToken: "token-1",
      room: createPlayingRoom(),
    });

    disconnect();

    expect(sessionReservations.consume("token-1")).toEqual({
      playerId: "socket-1",
      roomId: "room-1",
      playerName: "太郎",
      teamId: 2,
    });
  });

  it("トークンを提示していない切断では予約を残さないこと", () => {
    const { disconnect, reserveSpy } = setupConnection({
      room: createPlayingRoom(),
    });

    disconnect();

    expect(reserveSpy).not.toHaveBeenCalled();
  });

  it("空文字のトークンを提示した切断では予約を残さないこと", () => {
    const { disconnect, reserveSpy } = setupConnection({
      sessionToken: "",
      room: createPlayingRoom(),
    });

    disconnect();

    expect(reserveSpy).not.toHaveBeenCalled();
  });

  it("Bot置換に失敗した切断では予約を残さないこと", () => {
    const { disconnect, reserveSpy } = setupConnection({
      sessionToken: "token-1",
      room: createPlayingRoom(),
      replacedWithBot: false,
    });

    disconnect();

    expect(reserveSpy).not.toHaveBeenCalled();
  });

  it("ロビー中（ゲームランタイム未生成）の切断では予約を残さないこと", () => {
    const { disconnect, reserveSpy } = setupConnection({
      sessionToken: "token-1",
      room: createRoom({
        players: [createRoomMember({ id: "socket-1", name: "太郎" })],
      }),
      hasGameManager: false,
    });

    disconnect();

    expect(reserveSpy).not.toHaveBeenCalled();
  });

  it("ルーム名簿から引けない切断では予約を残さないこと", () => {
    const { disconnect, reserveSpy } = setupConnection({
      sessionToken: "token-1",
    });

    disconnect();

    expect(reserveSpy).not.toHaveBeenCalled();
  });

  it("名簿に居ないプレイヤーの切断では予約を残さないこと", () => {
    const { disconnect, reserveSpy } = setupConnection({
      sessionToken: "token-1",
      room: createPlayingRoom("other-socket"),
    });

    disconnect();

    expect(reserveSpy).not.toHaveBeenCalled();
  });

  it("予約にはゲームセッション側のチームIDを載せること", () => {
    const { disconnect, sessionReservations } = setupConnection({
      sessionToken: "token-1",
      room: createPlayingRoom(),
      teamId: 3,
    });

    disconnect();

    expect(sessionReservations.consume("token-1")?.teamId).toBe(3);
  });

  it("切断時はルーム名簿からプレイヤーを退出させること", () => {
    const { disconnect, roomManager } = setupConnection({
      sessionToken: "token-1",
      room: createPlayingRoom(),
    });

    disconnect();

    expect(roomManager.removePlayer).toHaveBeenCalledWith("socket-1");
  });

  it("切断時は識別子の対応を解放すること", () => {
    const { disconnect, identityRegistry } = setupConnection({
      sessionToken: "token-1",
      room: createPlayingRoom(),
    });
    identityRegistry.bind("socket-1", "player-1");

    disconnect();

    expect(identityRegistry.resolvePlayerId("socket-1")).toBe("socket-1");
  });

  it("復帰済みソケットの切断では引き継いだプレイヤーIDで退出させること", () => {
    const { disconnect, roomManager, identityRegistry } = setupConnection({
      sessionToken: "token-1",
      room: createPlayingRoom("player-1"),
    });
    identityRegistry.bind("socket-1", "player-1");

    disconnect();

    expect(roomManager.removePlayer).toHaveBeenCalledWith("player-1");
  });

  it("復帰済みソケットの切断では引き継いだプレイヤーIDで予約を残すこと", () => {
    const { disconnect, sessionReservations, identityRegistry } =
      setupConnection({
        sessionToken: "token-1",
        room: createPlayingRoom("player-1"),
      });
    identityRegistry.bind("socket-1", "player-1");

    disconnect();

    expect(sessionReservations.consume("token-1")?.playerId).toBe("player-1");
  });

  it("非文字列のトークンを提示した切断では予約を残さないこと", () => {
    const { disconnect, reserveSpy } = setupConnection({
      sessionToken: 12_345,
      room: createPlayingRoom(),
    });

    disconnect();

    expect(reserveSpy).not.toHaveBeenCalled();
  });
});
