/**
 * RoomRuntimeResolver.test
 * プレイヤー起点のランタイム解決の現行挙動を固定する characterization test
 * ルーム未解決・ランタイム未解決の失敗分岐を検証する
 */
import { domain } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import type { RoomScopedGamePort } from "../ports/roomUseCasePorts";
import {
  resolveRuntimeByPlayerId,
  runWithRuntimeByPlayerId,
} from "./RoomRuntimeResolver";

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

/** ルーム解決結果を固定した参照ポートスタブを生成する */
const createRoomResolverStub = (room: domain.room.Room | undefined) => {
  return {
    getRoomByPlayerId: vi.fn<
      (playerId: string) => domain.room.Room | undefined
    >(() => room),
  };
};

/** ランタイム解決結果を固定した参照ポートスタブを生成する */
const createRuntimeResolverStub = (
  gameManager: RoomScopedGamePort | undefined,
) => {
  return {
    getGameManagerByPlayerId: vi.fn<
      (playerId: string) => RoomScopedGamePort | undefined
    >(() => gameManager),
  };
};

const gameManagerStub = {} as RoomScopedGamePort;

describe("resolveRuntimeByPlayerId", () => {
  it("ルームとランタイムが揃う場合は解決結果を返すこと", () => {
    const result = resolveRuntimeByPlayerId(
      createRoomResolverStub(createRoom("room-1")),
      createRuntimeResolverStub(gameManagerStub),
      "socket-1",
    );

    expect(result).toEqual({ roomId: "room-1", gameManager: gameManagerStub });
  });

  it("ルームが解決できない場合はundefinedを返すこと", () => {
    const result = resolveRuntimeByPlayerId(
      createRoomResolverStub(undefined),
      createRuntimeResolverStub(gameManagerStub),
      "socket-1",
    );

    expect(result).toBeUndefined();
  });

  it("ランタイムが解決できない場合はundefinedを返すこと", () => {
    const result = resolveRuntimeByPlayerId(
      createRoomResolverStub(createRoom("room-1")),
      createRuntimeResolverStub(undefined),
      "socket-1",
    );

    expect(result).toBeUndefined();
  });

  it("ルームIDが空文字の場合もundefinedを返すこと", () => {
    const result = resolveRuntimeByPlayerId(
      createRoomResolverStub(createRoom("")),
      createRuntimeResolverStub(gameManagerStub),
      "socket-1",
    );

    expect(result).toBeUndefined();
  });
});

describe("runWithRuntimeByPlayerId", () => {
  it("解決に成功した場合はコールバックを実行すること", () => {
    const onResolved = vi.fn();

    runWithRuntimeByPlayerId(
      createRoomResolverStub(createRoom("room-1")),
      createRuntimeResolverStub(gameManagerStub),
      "socket-1",
      onResolved,
    );

    expect(onResolved).toHaveBeenCalledWith({
      roomId: "room-1",
      gameManager: gameManagerStub,
    });
  });

  it("解決に成功した場合はtrueを返すこと", () => {
    const result = runWithRuntimeByPlayerId(
      createRoomResolverStub(createRoom("room-1")),
      createRuntimeResolverStub(gameManagerStub),
      "socket-1",
      vi.fn(),
    );

    expect(result).toBe(true);
  });

  it("解決に失敗した場合はコールバックを実行しないこと", () => {
    const onResolved = vi.fn();

    runWithRuntimeByPlayerId(
      createRoomResolverStub(undefined),
      createRuntimeResolverStub(gameManagerStub),
      "socket-1",
      onResolved,
    );

    expect(onResolved).not.toHaveBeenCalled();
  });

  it("解決に失敗した場合はfalseを返すこと", () => {
    const result = runWithRuntimeByPlayerId(
      createRoomResolverStub(undefined),
      createRuntimeResolverStub(undefined),
      "socket-1",
      vi.fn(),
    );

    expect(result).toBe(false);
  });
});
