/**
 * RoomJoinService.test
 * ルーム参加サービスの現行挙動を固定する characterization test
 * status ユニオン（joined/duplicate/full/playing）の全分岐を検証する
 * 切断プレイヤーの復席（restored/not_found）についても仕様を検証する
 */
import { config as sharedConfig, domain } from "@repo/shared";
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

  it("別ルームに参加中のソケットが別のルームIDで参加するとduplicateで拒否すること", () => {
    const room = createRoom({ players: [createRoomMember({ id: "socket-1" })] });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.addPlayerToRoom("room-2", "socket-1", "太郎");

    expect(result.status).toBe("duplicate");
  });

  it("別ルームに参加中のソケットの参加要求では新規ルームを作成しないこと", () => {
    const room = createRoom({ players: [createRoomMember({ id: "socket-1" })] });
    const rooms = new Map([["room-1", room]]);
    const service = new RoomJoinService(rooms);

    service.addPlayerToRoom("room-2", "socket-1", "太郎");

    expect(rooms.has("room-2")).toBe(false);
  });

  it("別ルームに参加中のソケットは既存の別ルームにも追加しないこと", () => {
    const room1 = createRoom({
      roomId: "room-1",
      players: [createRoomMember({ id: "socket-1" })],
    });
    const room2 = createRoom({ roomId: "room-2", ownerId: "socket-2" });
    const service = new RoomJoinService(
      new Map([
        ["room-1", room1],
        ["room-2", room2],
      ]),
    );

    service.addPlayerToRoom("room-2", "socket-1", "太郎");

    expect(room2.players).toHaveLength(0);
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

describe("RoomJoinService.restorePlayerToRoom", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** 復席要求の既定値を部分上書きして生成する */
  const createRestoreParams = (
    overrides: Partial<Parameters<RoomJoinService["restorePlayerToRoom"]>[0]> = {},
  ) => {
    return {
      roomId: "room-1",
      playerId: "player-1",
      playerName: "太郎",
      teamId: 1,
      ...overrides,
    };
  };

  it("ルームが存在しない場合はnot_foundを返すこと", () => {
    const service = new RoomJoinService(new Map());

    const result = service.restorePlayerToRoom(createRestoreParams());

    expect(result.status).toBe("not_found");
  });

  it("ルームが存在する場合はrestoredを返すこと", () => {
    const room = createRoom();
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.restorePlayerToRoom(createRestoreParams());

    expect(result.status).toBe("restored");
  });

  it("復席したプレイヤーを名簿へ追加すること", () => {
    const room = createRoom();
    const service = new RoomJoinService(new Map([["room-1", room]]));

    service.restorePlayerToRoom(createRestoreParams());

    expect(room.players.map((player) => player.id)).toEqual(["player-1"]);
  });

  it("復席時は切断前の名前を保つこと", () => {
    const room = createRoom();
    const service = new RoomJoinService(new Map([["room-1", room]]));

    service.restorePlayerToRoom(createRestoreParams({ playerName: "花子" }));

    expect(room.players[0]?.name).toBe("花子");
  });

  it("復席時は切断前のチームIDを希望チームとして戻すこと", () => {
    const room = createRoom();
    const service = new RoomJoinService(new Map([["room-1", room]]));

    service.restorePlayerToRoom(createRestoreParams({ teamId: 2 }));

    expect(room.players[0]?.preferredTeamId).toBe(2);
  });

  it("チームID 0 の復席でも希望チームを 0 として戻すこと", () => {
    const room = createRoom();
    const service = new RoomJoinService(new Map([["room-1", room]]));

    service.restorePlayerToRoom(createRestoreParams({ teamId: 0 }));

    expect(room.players[0]?.preferredTeamId).toBe(0);
  });

  it("チームID未確定の復席では希望チームをnullにすること", () => {
    const room = createRoom();
    const service = new RoomJoinService(new Map([["room-1", room]]));

    service.restorePlayerToRoom(
      createRestoreParams({ teamId: sharedConfig.UNKNOWN_TEAM_ID }),
    );

    expect(room.players[0]?.preferredTeamId).toBeNull();
  });

  it("復席したプレイヤーは準備完了状態にしないこと", () => {
    const room = createRoom();
    const service = new RoomJoinService(new Map([["room-1", room]]));

    service.restorePlayerToRoom(createRestoreParams());

    expect(room.players[0]?.isReady).toBe(false);
  });

  it("復席してもオーナー権を奪い返さないこと", () => {
    const room = createRoom({
      ownerId: "socket-2",
      players: [createRoomMember({ id: "socket-2", isOwner: true })],
    });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    service.restorePlayerToRoom(createRestoreParams());

    expect(room.players.find((player) => player.id === "player-1")?.isOwner).toBe(
      false,
    );
  });

  it("復席しても移譲済みのオーナーIDを書き換えないこと", () => {
    const room = createRoom({
      ownerId: "socket-2",
      players: [createRoomMember({ id: "socket-2", isOwner: true })],
    });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    service.restorePlayerToRoom(createRestoreParams());

    expect(room.ownerId).toBe("socket-2");
  });

  it("既に在籍している場合は名簿を重複させないこと", () => {
    const room = createRoom({
      players: [createRoomMember({ id: "player-1" })],
    });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    service.restorePlayerToRoom(createRestoreParams());

    expect(room.players).toHaveLength(1);
  });

  it("既に在籍している場合もrestoredを返すこと", () => {
    const room = createRoom({
      players: [createRoomMember({ id: "player-1" })],
    });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.restorePlayerToRoom(createRestoreParams());

    expect(result.status).toBe("restored");
  });

  it("二重復席では既存の名簿情報を書き換えないこと", () => {
    const room = createRoom({
      players: [
        createRoomMember({ id: "player-1", name: "元の名前", isOwner: true }),
      ],
    });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    service.restorePlayerToRoom(createRestoreParams({ playerName: "別名" }));

    expect(room.players[0]).toEqual(
      createRoomMember({ id: "player-1", name: "元の名前", isOwner: true }),
    );
  });

  it("進行中のルームでも復席できること", () => {
    const room = createRoom({ status: domain.room.RoomPhase.PLAYING });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.restorePlayerToRoom(createRestoreParams());

    expect(result.status).toBe("restored");
  });

  it("定員に達したルームでも復席できること", () => {
    const room = createRoom({
      maxPlayers: 2,
      players: [
        createRoomMember({ id: "socket-1" }),
        createRoomMember({ id: "socket-2" }),
      ],
    });
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.restorePlayerToRoom(createRestoreParams());

    expect(result.status).toBe("restored");
  });

  it("復席結果として対象ルームの参照を返すこと", () => {
    const room = createRoom();
    const service = new RoomJoinService(new Map([["room-1", room]]));

    const result = service.restorePlayerToRoom(createRestoreParams());

    expect(result.status === "restored" ? result.room : null).toBe(room);
  });

  it("別ルームの名簿には影響しないこと", () => {
    const room1 = createRoom({ roomId: "room-1" });
    const room2 = createRoom({ roomId: "room-2" });
    const service = new RoomJoinService(
      new Map([
        ["room-1", room1],
        ["room-2", room2],
      ]),
    );

    service.restorePlayerToRoom(createRestoreParams());

    expect(room2.players).toHaveLength(0);
  });

  it("ルームが存在しない場合は名簿を作らないこと", () => {
    const rooms = new Map<string, domain.room.Room>();
    const service = new RoomJoinService(rooms);

    service.restorePlayerToRoom(createRestoreParams());

    expect(rooms.size).toBe(0);
  });
});
