/**
 * gameRuntimeResolvers.test
 * 送信処理で使うルーム／ランタイム参照解決の現行挙動を固定する characterization test
 * ルーム未解決・ランタイム未解決・Bot除外の分岐を検証する
 */
import type { domain } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import type { ActiveBombSnapshot } from "@server/domains/game/application/ports/gameUseCasePorts";
import type { RoomScopedGamePort } from "@server/domains/room/application/ports/roomUseCasePorts";
import {
  getActiveBombSnapshotsInRoom,
  getConnectedSocketIdsInRoom,
  getRoomPlayers,
  type RuntimeResolverDeps,
} from "./gameRuntimeResolvers";

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

/** テスト用のルームを生成する */
const createRoom = (memberIds: string[]): domain.room.Room => {
  return {
    roomId: "room-1",
    ownerId: memberIds[0] ?? "socket-1",
    players: memberIds.map(createMember),
    status: "playing",
    maxPlayers: 8,
    fieldSizePreset: "MEDIUM",
    teamAssignmentMode: "random",
  };
};

/** テスト用のプレイヤーデータを生成する */
const createPlayer = (id: string): domain.game.player.PlayerData => {
  return { id, name: `name-${id}`, x: 0, y: 0, teamId: 0 };
};

/** テスト用のアクティブ爆弾スナップショットを生成する */
const createBomb = (bombId: string): ActiveBombSnapshot => {
  return {
    bombId,
    ownerPlayerId: "socket-1",
    ownerTeamId: 0,
    x: 0,
    y: 0,
    explodeAtElapsedMs: 1000,
  };
};

/** ルーム／ランタイム解決結果を固定した依存スタブを生成する */
const createDeps = (params: {
  room?: domain.room.Room;
  players?: domain.game.player.PlayerData[];
  bombs?: ActiveBombSnapshot[];
  hasGameManager?: boolean;
}): RuntimeResolverDeps => {
  const gameManager = {
    getRoomPlayers: vi.fn(() => params.players ?? []),
    getActiveBombSnapshots: vi.fn(() => params.bombs ?? []),
  } as unknown as RoomScopedGamePort;

  return {
    roomManager: {
      getRoomById: vi.fn(() => params.room),
    },
    runtimeRegistry: {
      getGameManagerByRoomId: vi.fn(() =>
        params.hasGameManager === false ? undefined : gameManager,
      ),
    },
  };
};

describe("getConnectedSocketIdsInRoom", () => {
  it("ルームが存在しない場合は空配列を返すこと", () => {
    const deps = createDeps({ room: undefined });

    expect(getConnectedSocketIdsInRoom(deps, "room-1")).toEqual([]);
  });

  it("ルームに参加者がいない場合は空配列を返すこと", () => {
    const deps = createDeps({ room: createRoom([]) });

    expect(getConnectedSocketIdsInRoom(deps, "room-1")).toEqual([]);
  });

  it("参加者のソケットIDを返すこと", () => {
    const deps = createDeps({ room: createRoom(["socket-1", "socket-2"]) });

    expect(getConnectedSocketIdsInRoom(deps, "room-1")).toEqual([
      "socket-1",
      "socket-2",
    ]);
  });

  it("BotプレイヤーIDを除外すること", () => {
    const deps = createDeps({
      room: createRoom(["socket-1", "bot:room-1:1"]),
    });

    expect(getConnectedSocketIdsInRoom(deps, "room-1")).toEqual(["socket-1"]);
  });

  it("参加者が全員Botの場合は空配列を返すこと", () => {
    const deps = createDeps({
      room: createRoom(["bot:room-1:1", "bot:room-1:2"]),
    });

    expect(getConnectedSocketIdsInRoom(deps, "room-1")).toEqual([]);
  });

  it("bot接頭辞を含むが先頭でないIDは除外しないこと", () => {
    const deps = createDeps({ room: createRoom(["x-bot:room-1:1"]) });

    expect(getConnectedSocketIdsInRoom(deps, "room-1")).toEqual([
      "x-bot:room-1:1",
    ]);
  });

  it("指定したルームIDで参照すること", () => {
    const deps = createDeps({ room: createRoom(["socket-1"]) });

    getConnectedSocketIdsInRoom(deps, "room-9");

    expect(deps.roomManager.getRoomById).toHaveBeenCalledWith("room-9");
  });
});

describe("getRoomPlayers", () => {
  it("ランタイムが解決できない場合は空配列を返すこと", () => {
    const deps = createDeps({ hasGameManager: false });

    expect(getRoomPlayers(deps, "room-1")).toEqual([]);
  });

  it("ランタイムのプレイヤー一覧をそのまま返すこと", () => {
    const players = [createPlayer("socket-1"), createPlayer("socket-2")];
    const deps = createDeps({ players });

    expect(getRoomPlayers(deps, "room-1")).toEqual(players);
  });

  it("プレイヤーが0人の場合は空配列を返すこと", () => {
    const deps = createDeps({ players: [] });

    expect(getRoomPlayers(deps, "room-1")).toEqual([]);
  });

  it("指定したルームIDでランタイムを参照すること", () => {
    const deps = createDeps({ players: [] });

    getRoomPlayers(deps, "room-9");

    expect(deps.runtimeRegistry.getGameManagerByRoomId).toHaveBeenCalledWith(
      "room-9",
    );
  });
});

describe("getActiveBombSnapshotsInRoom", () => {
  it("ランタイムが解決できない場合は空配列を返すこと", () => {
    const deps = createDeps({ hasGameManager: false });

    expect(getActiveBombSnapshotsInRoom(deps, "room-1")).toEqual([]);
  });

  it("アクティブ爆弾一覧をそのまま返すこと", () => {
    const bombs = [createBomb("bomb-1"), createBomb("bomb-2")];
    const deps = createDeps({ bombs });

    expect(getActiveBombSnapshotsInRoom(deps, "room-1")).toEqual(bombs);
  });

  it("アクティブ爆弾が無い場合は空配列を返すこと", () => {
    const deps = createDeps({ bombs: [] });

    expect(getActiveBombSnapshotsInRoom(deps, "room-1")).toEqual([]);
  });

  it("ルーム参照ポートは利用しないこと", () => {
    const deps = createDeps({ bombs: [] });

    getActiveBombSnapshotsInRoom(deps, "room-1");

    expect(deps.roomManager.getRoomById).not.toHaveBeenCalled();
  });
});
