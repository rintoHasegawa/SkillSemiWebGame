/**
 * registerRoomHandlers.test
 * ルーム受信ハンドラ登録の仕様を検証するテスト
 * JOIN_ROOM で参加する Socket.IO ルーム名がクライアント指定値（他ソケットIDを含む）
 * と分離され，ルーム配信先と一致することを固定する
 * 受け入れ条件を満たさない入力（SPEC_02）については，参加処理を行わず
 * 拒否理由 invalid をソケットへ通知することを検証する
 */
import type { Server, Socket } from "socket.io";
import { contracts as protocol, domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { JoinRoomResult } from "@server/domains/room/application/ports/roomUseCasePorts";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";
import {
  PlayerIdentityRegistry,
  SessionReservationRegistry,
} from "@server/network/identity";
import { createRoom, createRoomMember } from "@server/testing/roomFixtures";
import type { RoomOutputAdapter } from "./createRoomOutputAdapter";
import { registerRoomHandlers } from "./registerRoomHandlers";

type EventListener = (payload: unknown) => void;

/** 受信リスナーと join 呼び出しを記録するソケットスタブを生成する */
const createSocketStub = (socketId: string) => {
  const listeners = new Map<string, EventListener>();
  // 呼び出し引数（参加ルームID）を検証できるよう引数付きで型付けする
  const join = vi.fn<(roomId: string) => Promise<undefined>>(
    async () => undefined,
  );
  // 明示退室で配信チャンネルから抜けることを検証できるよう引数付きで型付けする
  const leave = vi.fn<(roomId: string) => Promise<undefined>>(
    async () => undefined,
  );
  const disconnect = vi.fn();
  const socket = {
    id: socketId,
    on: (event: string, listener: EventListener) => {
      listeners.set(event, listener);
    },
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    join,
    leave,
    disconnect,
  } as unknown as Socket;

  return { socket, join, leave, disconnect, listeners };
};

/** 送信内容を記録するルーム出力アダプタースタブを生成する */
const createOutputStub = () => {
  return {
    publishRoomUpdateToRoom: vi.fn<
      RoomOutputAdapter["publishRoomUpdateToRoom"]
    >(),
    publishJoinRejectedToSocket: vi.fn<
      RoomOutputAdapter["publishJoinRejectedToSocket"]
    >(),
    publishSelectTeamRejectedToSocket: vi.fn<
      RoomOutputAdapter["publishSelectTeamRejectedToSocket"]
    >(),
    publishSessionResumedToSocket: vi.fn<
      RoomOutputAdapter["publishSessionResumedToSocket"]
    >(),
    publishResumeSessionRejectedToSocket: vi.fn<
      RoomOutputAdapter["publishResumeSessionRejectedToSocket"]
    >(),
    closeRoomChannel: vi.fn<RoomOutputAdapter["closeRoomChannel"]>(),
  } satisfies RoomOutputAdapter;
};

/** 参加成功を返すルーム管理スタブを生成する */
const createRoomManagerStub = (
  joinResult: JoinRoomResult,
  joinedRoom?: domain.room.Room,
) => {
  return {
    addPlayerToRoom: vi.fn(() => joinResult),
    getRoomByOwnerId: vi.fn(() => undefined),
    updateLobbySettings: vi.fn(() => undefined),
    selectTeam: vi.fn(() => ({ status: "not_found" as const })),
    restorePlayerToRoom: vi.fn(() => ({ status: "not_found" as const })),
    removePlayer: vi.fn(() => ({
      updatedRooms: joinedRoom ? [joinedRoom] : [],
      deletedRoomIds: [],
    })),
    getRoomByPlayerId: vi.fn<() => domain.room.Room | undefined>(
      () => joinedRoom,
    ),
  };
};

/** ルームハンドラが利用するランタイム管理スタブを生成する */
const createRuntimeRegistryStub = () => {
  return {
    ensureGameManagerForRoom: vi.fn<(roomId: string) => void>(),
    getGameManagerByRoomId: vi.fn(() => undefined),
    cleanupGameManagerForRoom: vi.fn<(roomId: string) => void>(),
  };
};

/** 識別子・復帰予約のレジストリスタブを生成する */
const createIdentityStubs = () => {
  return {
    identityRegistry: new PlayerIdentityRegistry(),
    sessionReservations: new SessionReservationRegistry(),
  };
};

/** 非同期の JOIN_ROOM 調停が完了するまでマイクロタスクを消化する */
const flushMicrotasks = async () => {
  await new Promise<void>((resolve) => setImmediate(resolve));
};

/** 被害者のソケットIDと同じ文字列をクライアントが roomId として指定した想定値 */
const VICTIM_SOCKET_ID = "victim-socket-id";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("registerRoomHandlers", () => {
  it("JOIN_ROOM の roomId が他ソケットIDと一致しても，そのソケットの個別ルームへは参加しないこと", async () => {
    const { socket, join, listeners } = createSocketStub("attacker-socket-id");
    const joinedRoom = createRoom({
      roomId: VICTIM_SOCKET_ID,
      ownerId: "attacker-socket-id",
      players: [createRoomMember({ id: "attacker-socket-id", isOwner: true })],
    });
    registerRoomHandlers({
      socket,
      roomManager: createRoomManagerStub({ status: "joined", room: joinedRoom }),
      runtimeRegistry: createRuntimeRegistryStub(),
      roomOutputAdapter: createOutputStub(),
      ...createIdentityStubs(),
    });

    listeners.get(protocol.SocketEvents.JOIN_ROOM)?.({
      roomId: VICTIM_SOCKET_ID,
      playerName: "attacker",
    });
    await flushMicrotasks();

    expect(join).toHaveBeenCalledTimes(1);
    expect(join).not.toHaveBeenCalledWith(VICTIM_SOCKET_ID);
  });

  it("JOIN_ROOM で参加する Socket.IO ルーム名が createEmitToRoom の配信先と一致すること", async () => {
    const { socket, join, listeners } = createSocketStub("socket-1");
    const joinedRoom = createRoom({
      players: [createRoomMember({ id: "socket-1", isOwner: true })],
    });
    registerRoomHandlers({
      socket,
      roomManager: createRoomManagerStub({ status: "joined", room: joinedRoom }),
      runtimeRegistry: createRuntimeRegistryStub(),
      roomOutputAdapter: createOutputStub(),
      ...createIdentityStubs(),
    });

    listeners.get(protocol.SocketEvents.JOIN_ROOM)?.({
      roomId: "room-1",
      playerName: "name-1",
    });
    await flushMicrotasks();

    const to = vi.fn(() => ({ emit: vi.fn() }));
    createEmitToRoom({ to } as unknown as Server)(
      "room-1",
      protocol.SocketEvents.ROOM_UPDATE,
      joinedRoom,
    );

    expect(join).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith(join.mock.calls[0][0]);
  });

  it("受け入れ条件を満たさない JOIN_ROOM では参加処理を行わないこと", async () => {
    const { socket, listeners } = createSocketStub("socket-1");
    const roomManager = createRoomManagerStub({
      status: "joined",
      room: createRoom(),
    });
    registerRoomHandlers({
      socket,
      roomManager,
      runtimeRegistry: createRuntimeRegistryStub(),
      roomOutputAdapter: createOutputStub(),
      ...createIdentityStubs(),
    });

    listeners.get(protocol.SocketEvents.JOIN_ROOM)?.({
      roomId: "room-1",
      playerName: "ta\nro",
    });
    await flushMicrotasks();

    expect(roomManager.addPlayerToRoom).not.toHaveBeenCalled();
  });

  it("受け入れ条件を満たさない JOIN_ROOM では拒否理由 invalid を通知すること", async () => {
    const { socket, listeners } = createSocketStub("socket-1");
    const output = createOutputStub();
    registerRoomHandlers({
      socket,
      roomManager: createRoomManagerStub({ status: "joined", room: createRoom() }),
      runtimeRegistry: createRuntimeRegistryStub(),
      roomOutputAdapter: output,
      ...createIdentityStubs(),
    });

    listeners.get(protocol.SocketEvents.JOIN_ROOM)?.({
      roomId: "room-1",
      playerName: "ta\nro",
    });
    await flushMicrotasks();

    expect(output.publishJoinRejectedToSocket).toHaveBeenCalledWith({
      roomId: "",
      reason: "invalid",
    });
  });

  it("最大長を超える roomId の JOIN_ROOM では受信値をそのまま返さないこと", async () => {
    const { socket, listeners } = createSocketStub("socket-1");
    const output = createOutputStub();
    const tooLongRoomId = "a".repeat(domain.room.ROOM_ID_MAX_LENGTH + 1);
    registerRoomHandlers({
      socket,
      roomManager: createRoomManagerStub({ status: "joined", room: createRoom() }),
      runtimeRegistry: createRuntimeRegistryStub(),
      roomOutputAdapter: output,
      ...createIdentityStubs(),
    });

    listeners.get(protocol.SocketEvents.JOIN_ROOM)?.({
      roomId: tooLongRoomId,
      playerName: "taro",
    });
    await flushMicrotasks();

    expect(output.publishJoinRejectedToSocket).toHaveBeenCalledWith({
      roomId: "",
      reason: "invalid",
    });
  });
  it("LEAVE_ROOM 受信ではソケットを切断しないこと", async () => {
    const { socket, disconnect, listeners } = createSocketStub("socket-1");
    const joinedRoom = createRoom({
      players: [createRoomMember({ id: "socket-1", isOwner: true })],
    });
    registerRoomHandlers({
      socket,
      roomManager: createRoomManagerStub(
        { status: "joined", room: joinedRoom },
        joinedRoom,
      ),
      runtimeRegistry: createRuntimeRegistryStub(),
      roomOutputAdapter: createOutputStub(),
      ...createIdentityStubs(),
    });

    listeners.get(protocol.SocketEvents.LEAVE_ROOM)?.(undefined);
    await flushMicrotasks();

    expect(disconnect).not.toHaveBeenCalled();
  });

  it("LEAVE_ROOM 受信ではルーム配信先と同じ Socket.IO ルーム名から退出させること", async () => {
    const { socket, leave, listeners } = createSocketStub("socket-1");
    const joinedRoom = createRoom({
      players: [createRoomMember({ id: "socket-1", isOwner: true })],
    });
    registerRoomHandlers({
      socket,
      roomManager: createRoomManagerStub(
        { status: "joined", room: joinedRoom },
        joinedRoom,
      ),
      runtimeRegistry: createRuntimeRegistryStub(),
      roomOutputAdapter: createOutputStub(),
      ...createIdentityStubs(),
    });

    listeners.get(protocol.SocketEvents.LEAVE_ROOM)?.(undefined);
    await flushMicrotasks();

    const to = vi.fn(() => ({ emit: vi.fn() }));
    createEmitToRoom({ to } as unknown as Server)(
      joinedRoom.roomId,
      protocol.SocketEvents.ROOM_UPDATE,
      joinedRoom,
    );

    expect(leave).toHaveBeenCalledTimes(1);
    expect(to).toHaveBeenCalledWith(leave.mock.calls[0][0]);
  });

  it("トークン未提示の RESUME_SESSION では理由 expired で拒否を通知すること", async () => {
    const { socket, listeners } = createSocketStub("socket-1");
    const output = createOutputStub();
    registerRoomHandlers({
      socket,
      roomManager: createRoomManagerStub({
        status: "joined",
        room: createRoom(),
      }),
      runtimeRegistry: createRuntimeRegistryStub(),
      roomOutputAdapter: output,
      ...createIdentityStubs(),
    });

    listeners.get(protocol.SocketEvents.RESUME_SESSION)?.(undefined);
    await flushMicrotasks();

    expect(output.publishResumeSessionRejectedToSocket).toHaveBeenCalledWith(
      "expired",
    );
  });
});
