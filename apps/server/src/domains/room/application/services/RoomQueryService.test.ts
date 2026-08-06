/**
 * RoomQueryService.test
 * ルーム参照サービスの現行挙動を固定する characterization test
 * ID・プレイヤー・オーナー起点の解決失敗を含めて検証する
 */
import { domain } from "@repo/shared";
import { describe, expect, it } from "vitest";

import { RoomQueryService } from "./RoomQueryService";

/** テスト用のルームメンバーを生成する */
const createMember = (id: string): domain.room.RoomMember => {
  return {
    id,
    name: `name-${id}`,
    isOwner: false,
    isReady: false,
    preferredTeamId: null,
  };
};

/** テスト用のルーム状態を生成する */
const createRoom = (
  roomId: string,
  ownerId: string,
  playerIds: string[],
): domain.room.Room => {
  return {
    roomId,
    ownerId,
    players: playerIds.map((id) => createMember(id)),
    status: domain.room.RoomPhase.WAITING,
    maxPlayers: 4,
    fieldSizePreset: "MEDIUM",
    teamAssignmentMode: "random",
  };
};

/** 2ルームを保持する参照サービスを生成する */
const createService = () => {
  const roomA = createRoom("room-a", "socket-1", ["socket-1", "socket-2"]);
  const roomB = createRoom("room-b", "socket-3", ["socket-3"]);

  return {
    roomA,
    roomB,
    service: new RoomQueryService(
      new Map([
        ["room-a", roomA],
        ["room-b", roomB],
      ]),
    ),
  };
};

describe("RoomQueryService", () => {
  it("ルームIDで対象ルームを返すこと", () => {
    const { roomB, service } = createService();

    expect(service.getRoomById("room-b")).toBe(roomB);
  });

  it("未登録のルームIDではundefinedを返すこと", () => {
    const { service } = createService();

    expect(service.getRoomById("room-x")).toBeUndefined();
  });

  it("プレイヤーIDから所属ルームを返すこと", () => {
    const { roomA, service } = createService();

    expect(service.getRoomByPlayerId("socket-2")).toBe(roomA);
  });

  it("どのルームにもいないプレイヤーIDではundefinedを返すこと", () => {
    const { service } = createService();

    expect(service.getRoomByPlayerId("socket-9")).toBeUndefined();
  });

  it("オーナーIDから該当ルームを返すこと", () => {
    const { roomB, service } = createService();

    expect(service.getRoomByOwnerId("socket-3")).toBe(roomB);
  });

  it("オーナーでないIDではundefinedを返すこと", () => {
    const { service } = createService();

    expect(service.getRoomByOwnerId("socket-2")).toBeUndefined();
  });

  it("ルームが1件もない場合はプレイヤー検索でundefinedを返すこと", () => {
    const service = new RoomQueryService(new Map());

    expect(service.getRoomByPlayerId("socket-1")).toBeUndefined();
  });
});
