/**
 * socketEmitters.test
 * Socket.IO 送信アダプタの配信先を検証するテスト
 * ルーム配信先がソケットIDの個別ルームと衝突しないことを固定する
 */
import type { Server } from "socket.io";
import { contracts as protocol } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import { createRoom } from "@server/testing/roomFixtures";
import {
  createEmitToRoom,
  createEmitToRoomExceptSocket,
  createEmitToSocketById,
} from "./socketEmitters";

/** 配信先ルーム名を記録する Socket.IO サーバスタブを生成する */
const createIoStub = () => {
  const emit = vi.fn();
  const except = vi.fn(() => ({ emit }));
  // 呼び出し引数（配信先ルームID）を検証できるよう引数付きで型付けする
  const to = vi.fn<
    (roomId: string) => { emit: typeof emit; except: typeof except }
  >(() => ({ emit, except }));
  const io = { to } as unknown as Server;

  return { io, to, except, emit };
};

/** 被害者のソケットIDと同じ文字列をクライアントが roomId として指定した想定値 */
const VICTIM_SOCKET_ID = "victim-socket-id";

describe("createEmitToRoom", () => {
  it("ルーム配信先の Socket.IO ルーム名をソケットID個別ルームと衝突しない名前にすること", () => {
    const { io, to } = createIoStub();

    createEmitToRoom(io)(
      VICTIM_SOCKET_ID,
      protocol.SocketEvents.ROOM_UPDATE,
      createRoom({ roomId: VICTIM_SOCKET_ID }),
    );

    expect(to).toHaveBeenCalledTimes(1);
    expect(to).not.toHaveBeenCalledWith(VICTIM_SOCKET_ID);
  });

  it("createEmitToRoomExceptSocket と同じ Socket.IO ルーム名へ配信すること", () => {
    const roomStub = createIoStub();
    const exceptStub = createIoStub();

    const room = createRoom();
    createEmitToRoom(roomStub.io)(
      "room-1",
      protocol.SocketEvents.ROOM_UPDATE,
      room,
    );
    createEmitToRoomExceptSocket(exceptStub.io)(
      "room-1",
      "socket-1",
      protocol.SocketEvents.ROOM_UPDATE,
      room,
    );

    expect(exceptStub.to).toHaveBeenCalledWith(roomStub.to.mock.calls[0][0]);
    expect(exceptStub.except).toHaveBeenCalledWith("socket-1");
  });
});

describe("createEmitToSocketById", () => {
  it("ソケットIDの個別ルームへそのまま配信すること", () => {
    const { io, to } = createIoStub();

    createEmitToSocketById(io)(
      VICTIM_SOCKET_ID,
      protocol.SocketEvents.ROOM_UPDATE,
      createRoom(),
    );

    expect(to).toHaveBeenCalledWith(VICTIM_SOCKET_ID);
  });
});
