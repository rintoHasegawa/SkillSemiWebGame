/**
 * RoomExitService.test
 * ルーム退出サービスの現行挙動を固定する characterization test
 * 退出，ルーム削除，オーナー移譲の分岐を検証する
 */
import { domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createRoom as createRoomFixture,
  createRoomMember,
} from "@server/testing/roomFixtures";
import { RoomExitService } from "./RoomExitService";

/** オーナー指定を短く書くためのメンバー生成ヘルパー */
const createMember = (
  id: string,
  isOwner = false,
): domain.room.RoomMember => {
  return createRoomMember({ id, isOwner });
};

/** 退出検証で多用する「メンバーとオーナーを指定したルーム」を生成する */
const createRoom = (
  roomId: string,
  players: domain.room.RoomMember[],
  ownerId: string,
): domain.room.Room => {
  return createRoomFixture({ roomId, players, ownerId });
};

describe("RoomExitService", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("所属ルームがない場合は更新ルームを返さないこと", () => {
    const rooms = new Map<string, domain.room.Room>([
      ["room-1", createRoom("room-1", [createMember("socket-1", true)], "socket-1")],
    ]);
    const service = new RoomExitService(rooms);

    const result = service.removePlayer("socket-9");

    expect(result).toEqual({ updatedRooms: [], deletedRoomIds: [] });
  });

  it("退出後もプレイヤーが残る場合は更新ルームとして返すこと", () => {
    const room = createRoom(
      "room-1",
      [createMember("socket-1", true), createMember("socket-2")],
      "socket-1",
    );
    const service = new RoomExitService(new Map([["room-1", room]]));

    const result = service.removePlayer("socket-2");

    expect(result.updatedRooms).toEqual([room]);
  });

  it("退出したプレイヤーをルームから取り除くこと", () => {
    const room = createRoom(
      "room-1",
      [createMember("socket-1", true), createMember("socket-2")],
      "socket-1",
    );
    const service = new RoomExitService(new Map([["room-1", room]]));

    service.removePlayer("socket-2");

    expect(room.players.map((player) => player.id)).toEqual(["socket-1"]);
  });

  it("最後の1人が退出した場合はルームを削除すること", () => {
    const rooms = new Map([
      ["room-1", createRoom("room-1", [createMember("socket-1", true)], "socket-1")],
    ]);
    const service = new RoomExitService(rooms);

    service.removePlayer("socket-1");

    expect(rooms.has("room-1")).toBe(false);
  });

  it("削除したルームIDを削除リストへ含めること", () => {
    const rooms = new Map([
      ["room-1", createRoom("room-1", [createMember("socket-1", true)], "socket-1")],
    ]);
    const service = new RoomExitService(rooms);

    const result = service.removePlayer("socket-1");

    expect(result.deletedRoomIds).toEqual(["room-1"]);
  });

  it("ルーム削除時は更新ルームへ含めないこと", () => {
    const rooms = new Map([
      ["room-1", createRoom("room-1", [createMember("socket-1", true)], "socket-1")],
    ]);
    const service = new RoomExitService(rooms);

    const result = service.removePlayer("socket-1");

    expect(result.updatedRooms).toEqual([]);
  });

  it("オーナーが退出した場合は先頭プレイヤーへオーナーを移譲すること", () => {
    const room = createRoom(
      "room-1",
      [createMember("socket-1", true), createMember("socket-2")],
      "socket-1",
    );
    const service = new RoomExitService(new Map([["room-1", room]]));

    service.removePlayer("socket-1");

    expect(room.ownerId).toBe("socket-2");
  });

  it("オーナー移譲時は新オーナーのisOwnerをtrueにすること", () => {
    const room = createRoom(
      "room-1",
      [createMember("socket-1", true), createMember("socket-2")],
      "socket-1",
    );
    const service = new RoomExitService(new Map([["room-1", room]]));

    service.removePlayer("socket-1");

    expect(room.players[0]?.isOwner).toBe(true);
  });

  it("オーナー以外の退出ではオーナーを変更しないこと", () => {
    const room = createRoom(
      "room-1",
      [createMember("socket-1", true), createMember("socket-2")],
      "socket-1",
    );
    const service = new RoomExitService(new Map([["room-1", room]]));

    service.removePlayer("socket-2");

    expect(room.ownerId).toBe("socket-1");
  });

  it("複数ルームに同一IDが所属する場合は全ルームから退出させること", () => {
    const roomA = createRoom(
      "room-a",
      [createMember("socket-1", true), createMember("socket-2")],
      "socket-1",
    );
    const roomB = createRoom(
      "room-b",
      [createMember("socket-1"), createMember("socket-3", true)],
      "socket-3",
    );
    const service = new RoomExitService(
      new Map([
        ["room-a", roomA],
        ["room-b", roomB],
      ]),
    );

    const result = service.removePlayer("socket-1");

    expect(result.updatedRooms).toEqual([roomA, roomB]);
  });
});
