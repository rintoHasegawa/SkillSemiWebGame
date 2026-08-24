/**
 * registerRoomHandlers.test
 * ルーム受信ハンドラ登録の仕様を検証するテスト
 * JOIN_ROOM で参加する Socket.IO ルーム名がクライアント指定値（他ソケットIDを含む）
 * と分離され，ルーム配信先と一致することを固定する
 */
import type { Server, Socket } from "socket.io";
import { contracts as protocol } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { JoinRoomResult } from "@server/domains/room/application/ports/roomUseCasePorts";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";
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
  const socket = {
    id: socketId,
    on: (event: string, listener: EventListener) => {
      listeners.set(event, listener);
    },
    once: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    join,
  } as unknown as Socket;

  return { socket, join, listeners };
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
  } satisfies RoomOutputAdapter;
};

/** 参加成功を返すルーム管理スタブを生成する */
const createRoomManagerStub = (joinResult: JoinRoomResult) => {
  return {
    addPlayerToRoom: vi.fn(() => joinResult),
    getRoomByOwnerId: vi.fn(() => undefined),
    updateLobbySettings: vi.fn(() => undefined),
    selectTeam: vi.fn(() => ({ status: "not_found" as const })),
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
    registerRoomHandlers(
      socket,
      createRoomManagerStub({ status: "joined", room: joinedRoom }),
      { ensureGameManagerForRoom: vi.fn() },
      createOutputStub(),
    );

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
    registerRoomHandlers(
      socket,
      createRoomManagerStub({ status: "joined", room: joinedRoom }),
      { ensureGameManagerForRoom: vi.fn() },
      createOutputStub(),
    );

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
});
