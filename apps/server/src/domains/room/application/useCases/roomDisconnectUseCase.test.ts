/**
 * roomDisconnectUseCase.test
 * ルーム切断ユースケースの現行挙動を固定する characterization test
 * 更新ルーム配信と削除ルームのランタイム破棄・配信チャンネル閉鎖を検証する
 */
import { domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRoom, createRoomMember } from "@server/testing/roomFixtures";
import type { RoomDisconnectResult } from "../ports/roomUseCasePorts";
import { roomDisconnectUseCase } from "./roomDisconnectUseCase";

/** オーナー1名が在室しているテスト用ルームを生成する */
const createRoomWithOwner = (roomId: string): domain.room.Room => {
  return createRoom({
    roomId,
    players: [
      createRoomMember({ id: "socket-1", name: "太郎", isOwner: true }),
    ],
  });
};

/** 退出結果を固定した DisconnectRoomPort スタブを生成する */
const createRoomManagerStub = (result: RoomDisconnectResult) => {
  return {
    removePlayer: vi.fn<(socketId: string) => RoomDisconnectResult>(
      () => result,
    ),
  };
};

/** ランタイム破棄呼び出しを記録するポートスタブを生成する */
const createRuntimeRegistryStub = () => {
  return {
    cleanupGameManagerForRoom: vi.fn<(roomId: string) => void>(),
  };
};

/** ルーム更新配信を記録する出力ポートスタブを生成する */
const createOutputStub = () => {
  return {
    publishRoomUpdateToRoom: vi.fn<
      (roomId: string, room: domain.room.Room) => void
    >(),
    closeRoomChannel: vi.fn<(roomId: string) => void>(),
  };
};

describe("roomDisconnectUseCase", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("切断ソケットIDでルーム退出処理を実行すること", () => {
    const roomManager = createRoomManagerStub({
      updatedRooms: [],
      deletedRoomIds: [],
    });

    roomDisconnectUseCase({
      roomManager,
      runtimeRegistry: createRuntimeRegistryStub(),
      socketId: "socket-9",
      output: createOutputStub(),
    });

    expect(roomManager.removePlayer).toHaveBeenCalledWith("socket-9");
  });

  it("更新ルームがない場合はルーム更新を配信しないこと", () => {
    const output = createOutputStub();

    roomDisconnectUseCase({
      roomManager: createRoomManagerStub({
        updatedRooms: [],
        deletedRoomIds: [],
      }),
      runtimeRegistry: createRuntimeRegistryStub(),
      socketId: "socket-9",
      output,
    });

    expect(output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });

  it("更新ルームごとに最新状態を配信すること", () => {
    const output = createOutputStub();
    const roomA = createRoomWithOwner("room-a");
    const roomB = createRoomWithOwner("room-b");

    roomDisconnectUseCase({
      roomManager: createRoomManagerStub({
        updatedRooms: [roomA, roomB],
        deletedRoomIds: [],
      }),
      runtimeRegistry: createRuntimeRegistryStub(),
      socketId: "socket-9",
      output,
    });

    expect(output.publishRoomUpdateToRoom.mock.calls).toEqual([
      ["room-a", roomA],
      ["room-b", roomB],
    ]);
  });

  it("削除ルームがない場合はランタイムを破棄しないこと", () => {
    const runtimeRegistry = createRuntimeRegistryStub();

    roomDisconnectUseCase({
      roomManager: createRoomManagerStub({
        updatedRooms: [createRoomWithOwner("room-a")],
        deletedRoomIds: [],
      }),
      runtimeRegistry,
      socketId: "socket-9",
      output: createOutputStub(),
    });

    expect(runtimeRegistry.cleanupGameManagerForRoom).not.toHaveBeenCalled();
  });

  it("削除ルームごとにゲームランタイムを破棄すること", () => {
    const runtimeRegistry = createRuntimeRegistryStub();

    roomDisconnectUseCase({
      roomManager: createRoomManagerStub({
        updatedRooms: [],
        deletedRoomIds: ["room-a", "room-b"],
      }),
      runtimeRegistry,
      socketId: "socket-9",
      output: createOutputStub(),
    });

    expect(runtimeRegistry.cleanupGameManagerForRoom.mock.calls).toEqual([
      ["room-a"],
      ["room-b"],
    ]);
  });

  it("削除ルームごとに配信チャンネルを閉じること", () => {
    const output = createOutputStub();

    roomDisconnectUseCase({
      roomManager: createRoomManagerStub({
        updatedRooms: [],
        deletedRoomIds: ["room-a", "room-b"],
      }),
      runtimeRegistry: createRuntimeRegistryStub(),
      socketId: "socket-9",
      output,
    });

    expect(output.closeRoomChannel.mock.calls).toEqual([
      ["room-a"],
      ["room-b"],
    ]);
  });

  it("削除ルームがない場合は配信チャンネルを閉じないこと", () => {
    const output = createOutputStub();

    roomDisconnectUseCase({
      roomManager: createRoomManagerStub({
        updatedRooms: [createRoomWithOwner("room-a")],
        deletedRoomIds: [],
      }),
      runtimeRegistry: createRuntimeRegistryStub(),
      socketId: "socket-9",
      output,
    });

    expect(output.closeRoomChannel).not.toHaveBeenCalled();
  });

  it("削除ルームのみの場合はルーム更新を配信しないこと", () => {
    const output = createOutputStub();

    roomDisconnectUseCase({
      roomManager: createRoomManagerStub({
        updatedRooms: [],
        deletedRoomIds: ["room-a"],
      }),
      runtimeRegistry: createRuntimeRegistryStub(),
      socketId: "socket-9",
      output,
    });

    expect(output.publishRoomUpdateToRoom).not.toHaveBeenCalled();
  });
});
