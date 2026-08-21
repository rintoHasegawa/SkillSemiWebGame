/**
 * RoomQueryService.test
 * ルーム参照サービスの現行挙動を固定する characterization test
 * ID・プレイヤー・オーナー起点の解決失敗を含めて検証する
 */
import { domain } from "@repo/shared";
import { describe, expect, it } from "vitest";

import { createRoom, createRoomMember } from "@server/testing/roomFixtures";
import { RoomQueryService } from "./RoomQueryService";

/** プレイヤーID配列からテスト用のルーム状態を生成する */
const createRoomWithPlayers = (
  roomId: string,
  ownerId: string,
  playerIds: string[],
): domain.room.Room => {
  return createRoom({
    roomId,
    ownerId,
    players: playerIds.map((id) => createRoomMember({ id })),
  });
};

/** 2ルームを保持する参照サービスを生成する */
const createService = () => {
  const roomA = createRoomWithPlayers("room-a", "socket-1", [
    "socket-1",
    "socket-2",
  ]);
  const roomB = createRoomWithPlayers("room-b", "socket-3", ["socket-3"]);

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
