/**
 * RoomJoinService.test
 * ルーム参加サービスの現行挙動を固定する characterization test
 * status ユニオン（joined/duplicate/full/playing）の全分岐を検証する
 */
import { domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createRoom as createRoomFixture,
  createRoomMember,
} from "@server/testing/roomFixtures";
import { RoomJoinService } from "./RoomJoinService";

/** 満員条件を最小人数で検証するため定員2を既定としたルームを生成する */
const createRoom = (
  overrides: Partial<domain.room.Room> = {},
): domain.room.Room => {
  return createRoomFixture({ maxPlayers: 2, ...overrides });
};

describe("RoomJoinService", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未作成のルームIDでは新規ルームを作成して参加を許可すること", () => {
    const rooms = new Map<string, domain.room.Room>();
    const service = new RoomJoinService(rooms);

    const result = service.addPlayerToRoom("room-1", "socket-1", "太郎");

    expect(result.status).toBe("joined");
  });

  it("新規ルーム作成時は参加者をオーナーに設定すること", () => {
    const rooms = new Map<string, domain.room.Room>();
    const service = new RoomJoinService(rooms);

    const result = service.addPlayerToRoom("room-1", "socket-1", "太郎");

    expect(result.room.ownerId).toBe("socket-1");
  });

  it("新規ルーム作成時は待機中フェーズで初期化すること", () => {
    const rooms = new Map<string, domain.room.Room>();
    const service = new RoomJoinService(rooms);

    const result = service.addPlayerToRoom("room-1", "socket-1", "太郎");

    expect(result.room.status).toBe(domain.room.RoomPhase.WAITING);
  });

  it("参加成功時はプレイヤーをルームへ追加すること", () => {
    const rooms = new Map<string, domain.room.Room>();
    const service = new RoomJoinService(rooms);

    const result = service.addPlayerToRoom("room-1", "socket-1", "太郎");

    expect(result.room.players).toEqual([
      {
        id: "socket-1",
        name: "太郎",
        isOwner: true,
        isReady: false,
        preferredTeamId: null,
      },
    ]);
  });

  it("オーナー以外の参加者はisOwnerをfalseにすること", () => {
    const room = createRoom({ players: [createRoomMember({ id: "socket-1" })] });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.addPlayerToRoom("room-1", "socket-2", "次郎");

    expect(result.room.players[1]?.isOwner).toBe(false);
  });

  it("プレイ中のルームへの参加はplayingで拒否すること", () => {
    const room = createRoom({ status: domain.room.RoomPhase.PLAYING });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.addPlayerToRoom("room-1", "socket-2", "次郎");

    expect(result.status).toBe("playing");
  });

  it("リザルト中のルームへの参加もplayingとして拒否すること", () => {
    const room = createRoom({ status: domain.room.RoomPhase.RESULT });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.addPlayerToRoom("room-1", "socket-2", "次郎");

    expect(result.status).toBe("playing");
  });

  it("プレイ中で拒否した場合はプレイヤーを追加しないこと", () => {
    const room = createRoom({ status: domain.room.RoomPhase.PLAYING });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    service.addPlayerToRoom("room-1", "socket-2", "次郎");

    expect(room.players).toHaveLength(0);
  });

  it("同一ソケットの再参加はduplicateで拒否すること", () => {
    const room = createRoom({ players: [createRoomMember({ id: "socket-1" })] });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.addPlayerToRoom("room-1", "socket-1", "太郎");

    expect(result.status).toBe("duplicate");
  });

  it("重複参加で拒否した場合はプレイヤーを増やさないこと", () => {
    const room = createRoom({ players: [createRoomMember({ id: "socket-1" })] });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    service.addPlayerToRoom("room-1", "socket-1", "太郎");

    expect(room.players).toHaveLength(1);
  });

  it("定員に達したルームへの参加はfullで拒否すること", () => {
    const room = createRoom({
      maxPlayers: 2,
      players: [createRoomMember({ id: "socket-1" }), createRoomMember({ id: "socket-2" })],
    });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.addPlayerToRoom("room-1", "socket-3", "三郎");

    expect(result.status).toBe("full");
  });

  it("定員直前の参加は許可すること", () => {
    const room = createRoom({
      maxPlayers: 2,
      players: [createRoomMember({ id: "socket-1" })],
    });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.addPlayerToRoom("room-1", "socket-2", "次郎");

    expect(result.status).toBe("joined");
  });

  it("定員0のルームでは参加をfullで拒否すること", () => {
    const room = createRoom({ maxPlayers: 0 });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.addPlayerToRoom("room-1", "socket-1", "太郎");

    expect(result.status).toBe("full");
  });
});
