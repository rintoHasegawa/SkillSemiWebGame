/**
 * RoomGameRuntimeRegistry.test
 * ゲームランタイム管理の現行挙動を固定する characterization test
 * 生成の冪等性，解決失敗，ルーム残存時の破棄抑止を検証する
 */
import { domain } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import { RoomGameRuntimeRegistry } from "./RoomGameRuntimeRegistry";

/** テスト用のルーム状態を生成する */
const createRoom = (roomId: string): domain.room.Room => {
  return {
    roomId,
    ownerId: "socket-1",
    players: [],
    status: domain.room.RoomPhase.WAITING,
    maxPlayers: 4,
    fieldSizePreset: "MEDIUM",
    teamAssignmentMode: "random",
  };
};

/** ルーム参照結果を固定したリゾルバスタブを生成する */
const createRoomResolverStub = (rooms: Map<string, domain.room.Room>) => {
  return {
    getRoomById: vi.fn<(roomId: string) => domain.room.Room | undefined>(
      (roomId) => rooms.get(roomId),
    ),
    getRoomByPlayerId: vi.fn<
      (playerId: string) => domain.room.Room | undefined
    >((playerId) => {
      for (const room of rooms.values()) {
        if (room.players.some((player) => player.id === playerId)) {
          return room;
        }
      }

      return undefined;
    }),
  };
};

describe("RoomGameRuntimeRegistry", () => {
  it("ルームIDに対してゲーム管理を生成すること", () => {
    const registry = new RoomGameRuntimeRegistry(
      createRoomResolverStub(new Map()),
    );

    registry.ensureGameManagerForRoom("room-1");

    expect(registry.getGameManagerByRoomId("room-1")).toBeDefined();
  });

  it("同一ルームで再生成せず同じインスタンスを返すこと", () => {
    const registry = new RoomGameRuntimeRegistry(
      createRoomResolverStub(new Map()),
    );

    registry.ensureGameManagerForRoom("room-1");
    const first = registry.getGameManagerByRoomId("room-1");
    registry.ensureGameManagerForRoom("room-1");

    expect(registry.getGameManagerByRoomId("room-1")).toBe(first);
  });

  it("未生成のルームIDではundefinedを返すこと", () => {
    const registry = new RoomGameRuntimeRegistry(
      createRoomResolverStub(new Map()),
    );

    expect(registry.getGameManagerByRoomId("room-x")).toBeUndefined();
  });

  it("プレイヤーIDから所属ルームのゲーム管理を返すこと", () => {
    const room = createRoom("room-1");
    room.players.push({
      id: "socket-1",
      name: "太郎",
      isOwner: true,
      isReady: false,
      preferredTeamId: null,
    });
    const registry = new RoomGameRuntimeRegistry(
      createRoomResolverStub(new Map([["room-1", room]])),
    );
    registry.ensureGameManagerForRoom("room-1");

    expect(registry.getGameManagerByPlayerId("socket-1")).toBe(
      registry.getGameManagerByRoomId("room-1"),
    );
  });

  it("所属ルームが解決できないプレイヤーIDではundefinedを返すこと", () => {
    const registry = new RoomGameRuntimeRegistry(
      createRoomResolverStub(new Map()),
    );
    registry.ensureGameManagerForRoom("room-1");

    expect(registry.getGameManagerByPlayerId("socket-9")).toBeUndefined();
  });

  it("ルームが残っている場合はゲーム管理を破棄しないこと", () => {
    const rooms = new Map([["room-1", createRoom("room-1")]]);
    const registry = new RoomGameRuntimeRegistry(createRoomResolverStub(rooms));
    registry.ensureGameManagerForRoom("room-1");

    registry.cleanupGameManagerForRoom("room-1");

    expect(registry.getGameManagerByRoomId("room-1")).toBeDefined();
  });

  it("ルーム削除済みの場合はゲーム管理を破棄すること", () => {
    const registry = new RoomGameRuntimeRegistry(
      createRoomResolverStub(new Map()),
    );
    registry.ensureGameManagerForRoom("room-1");

    registry.cleanupGameManagerForRoom("room-1");

    expect(registry.getGameManagerByRoomId("room-1")).toBeUndefined();
  });

  it("未生成ルームの破棄要求でも例外を投げないこと", () => {
    const registry = new RoomGameRuntimeRegistry(
      createRoomResolverStub(new Map()),
    );

    expect(() => registry.cleanupGameManagerForRoom("room-x")).not.toThrow();
  });
});
