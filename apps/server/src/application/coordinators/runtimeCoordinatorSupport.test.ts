/**
 * runtimeCoordinatorSupport.test
 * コーディネータ層のランタイム解決の現行挙動を固定する characterization test
 * ルーム未解決・ランタイム未解決の失敗分岐を検証する
 */
import { domain } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import type { RoomScopedGamePort } from "@server/domains/room/application/ports/roomUseCasePorts";
import { createRoom } from "@server/testing/roomFixtures";
import { resolveCoordinatorRuntime } from "./runtimeCoordinatorSupport";

const gameManagerStub = {} as RoomScopedGamePort;

/** ルームとランタイムの解決結果を固定した依存集合を生成する */
const createDeps = (
  room: domain.room.Room | undefined,
  gameManager: RoomScopedGamePort | undefined,
) => {
  return {
    roomManager: {
      getRoomByPlayerId: vi.fn<
        (playerId: string) => domain.room.Room | undefined
      >(() => room),
    },
    runtimeRegistry: {
      getGameManagerByPlayerId: vi.fn<
        (playerId: string) => RoomScopedGamePort | undefined
      >(() => gameManager),
    },
  };
};

describe("resolveCoordinatorRuntime", () => {
  it("ルームとランタイムが揃う場合は解決結果を返すこと", () => {
    const deps = createDeps(createRoom({ roomId: "room-1" }), gameManagerStub);

    const result = resolveCoordinatorRuntime(deps, "socket-1");

    expect(result).toEqual({ roomId: "room-1", gameManager: gameManagerStub });
  });

  it("解決時に受け取ったsocketIdを両ポートへ渡すこと", () => {
    const deps = createDeps(createRoom({ roomId: "room-1" }), gameManagerStub);

    resolveCoordinatorRuntime(deps, "socket-99");

    expect(deps.roomManager.getRoomByPlayerId).toHaveBeenCalledWith("socket-99");
    expect(deps.runtimeRegistry.getGameManagerByPlayerId).toHaveBeenCalledWith(
      "socket-99",
    );
  });

  it("ルームが解決できない場合はundefinedを返すこと", () => {
    const deps = createDeps(undefined, gameManagerStub);

    expect(resolveCoordinatorRuntime(deps, "socket-1")).toBeUndefined();
  });

  it("ランタイムが解決できない場合はundefinedを返すこと", () => {
    const deps = createDeps(createRoom({ roomId: "room-1" }), undefined);

    expect(resolveCoordinatorRuntime(deps, "socket-1")).toBeUndefined();
  });

  it("ルームIDが空文字の場合はundefinedを返すこと", () => {
    const deps = createDeps(createRoom({ roomId: "" }), gameManagerStub);

    expect(resolveCoordinatorRuntime(deps, "socket-1")).toBeUndefined();
  });
});
