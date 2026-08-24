/**
 * roomEventGuards.test
 * ルーム宛イベントの受理判定が自分の所属ルームに限定されることを検証する
 * JOIN直後の初回ROOM_UPDATE受理と，所属外イベントの無視を確認する
 */
import { describe, expect, it } from "vitest";

import { domain } from "@repo/shared";
import type { GameStartPayload } from "@repo/shared";

import type { RoomMembership } from "./roomEventGuards";
import { shouldAcceptGameStart, shouldAcceptRoomUpdate } from "./roomEventGuards";

/** テスト用のルーム所属プレイヤーを生成する */
const createRoomMember = (id: string): domain.room.RoomMember => {
  return {
    id,
    name: `name-${id}`,
    isOwner: false,
    isReady: false,
    preferredTeamId: null,
  };
};

/** 指定IDのプレイヤーが在室するテスト用ルームを生成する */
const createRoom = (
  roomId: string,
  playerIds: string[] = [],
): domain.room.Room => {
  return {
    roomId,
    ownerId: playerIds[0] ?? "owner-1",
    players: playerIds.map((id) => createRoomMember(id)),
    status: "waiting",
    maxPlayers: 8,
    fieldSizePreset: "MEDIUM",
    teamAssignmentMode: "random",
  };
};

/** テスト用の所属状態を生成する */
const createMembership = (
  overrides: Partial<RoomMembership> = {},
): RoomMembership => {
  return {
    currentRoomId: "room-1",
    myId: "socket-1",
    ...overrides,
  };
};

/** テスト用のゲーム開始ペイロードを生成する */
const createGameStartPayload = (roomId: string): GameStartPayload => {
  return {
    roomId,
    serverElapsedMs: -5_000,
    fieldSizePreset: "MEDIUM",
    gridCols: 36,
    gridRows: 36,
  };
};

describe("shouldAcceptRoomUpdate", () => {
  it("自分の所属ルームのROOM_UPDATEを受理すること", () => {
    const accepted = shouldAcceptRoomUpdate({
      membership: createMembership(),
      updatedRoom: createRoom("room-1", ["socket-1"]),
    });

    expect(accepted).toBe(true);
  });

  it("JOIN直後の初回ROOM_UPDATEを受理すること", () => {
    const accepted = shouldAcceptRoomUpdate({
      membership: createMembership({ currentRoomId: null }),
      updatedRoom: createRoom("room-1", ["socket-1"]),
    });

    expect(accepted).toBe(true);
  });

  it("別ルームのROOM_UPDATEを無視すること", () => {
    const accepted = shouldAcceptRoomUpdate({
      membership: createMembership({ currentRoomId: "room-1" }),
      updatedRoom: createRoom("room-2", ["socket-1"]),
    });

    expect(accepted).toBe(false);
  });

  it("名簿に自分が含まれないROOM_UPDATEを無視すること", () => {
    const accepted = shouldAcceptRoomUpdate({
      membership: createMembership(),
      updatedRoom: createRoom("room-1", ["socket-2"]),
    });

    expect(accepted).toBe(false);
  });

  it("未入室でも名簿に自分が居ないROOM_UPDATEを無視すること", () => {
    const accepted = shouldAcceptRoomUpdate({
      membership: createMembership({ currentRoomId: null }),
      updatedRoom: createRoom("room-2", ["socket-2"]),
    });

    expect(accepted).toBe(false);
  });

  it("未接続の場合はROOM_UPDATEを無視すること", () => {
    const accepted = shouldAcceptRoomUpdate({
      membership: createMembership({ myId: null }),
      updatedRoom: createRoom("room-1", ["socket-1"]),
    });

    expect(accepted).toBe(false);
  });
});

describe("shouldAcceptGameStart", () => {
  it("自分の所属ルームのGAME_STARTを受理すること", () => {
    const accepted = shouldAcceptGameStart({
      membership: createMembership({ currentRoomId: "room-1" }),
      payload: createGameStartPayload("room-1"),
    });

    expect(accepted).toBe(true);
  });

  it("別ルームのGAME_STARTを無視すること", () => {
    const accepted = shouldAcceptGameStart({
      membership: createMembership({ currentRoomId: "room-1" }),
      payload: createGameStartPayload("room-2"),
    });

    expect(accepted).toBe(false);
  });

  it("未入室の場合はGAME_STARTを無視すること", () => {
    const accepted = shouldAcceptGameStart({
      membership: createMembership({ currentRoomId: null }),
      payload: createGameStartPayload("room-1"),
    });

    expect(accepted).toBe(false);
  });

  it("未接続の場合はGAME_STARTを無視すること", () => {
    const accepted = shouldAcceptGameStart({
      membership: createMembership({ myId: null }),
      payload: createGameStartPayload("room-1"),
    });

    expect(accepted).toBe(false);
  });
});
