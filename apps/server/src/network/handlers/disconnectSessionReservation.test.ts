/**
 * disconnectSessionReservation.test
 * 切断時に採取する復帰予約情報の仕様を検証する
 * ルーム未解決・名簿未在籍・ランタイム未解決の各分岐と，
 * チームIDをゲームセッション側から採る仕様を対象とする
 */
import { domain } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";

import type { RoomScopedGamePort } from "@server/domains/room/application/ports/roomUseCasePorts";
import { createRoomScopedGamePortStub } from "@server/testing/gamePortFixtures";
import { createRoom, createRoomMember } from "@server/testing/roomFixtures";
import { collectSessionReservationEntry } from "./disconnectSessionReservation";

type DepsParams = {
  room?: domain.room.Room;
  hasGameManager?: boolean;
  teamId?: number;
};

/** 在籍情報の採取で参照するポートのスタブを生成する */
const createDeps = ({
  room,
  hasGameManager = true,
  teamId = 1,
}: DepsParams = {}) => {
  const gameManager = createRoomScopedGamePortStub({
    getPlayerTeamId: vi.fn(() => teamId),
  });

  return {
    roomManager: {
      getRoomByPlayerId: vi.fn<
        (playerId: string) => domain.room.Room | undefined
      >(() => room),
    },
    runtimeRegistry: {
      getGameManagerByPlayerId: vi.fn<
        (playerId: string) => RoomScopedGamePort | undefined
      >(() => (hasGameManager ? gameManager : undefined)),
    },
  };
};

/** 対象プレイヤーが在籍する進行中ルームを生成する */
const createPlayingRoom = () => {
  return createRoom({
    status: domain.room.RoomPhase.PLAYING,
    players: [createRoomMember({ id: "player-1", name: "太郎" })],
  });
};

describe("collectSessionReservationEntry", () => {
  it("所属ルームを引けない場合は undefined を返すこと", () => {
    const deps = createDeps();

    expect(collectSessionReservationEntry(deps, "player-1")).toBeUndefined();
  });

  it("ルーム名簿に居ない場合は undefined を返すこと", () => {
    const deps = createDeps({
      room: createRoom({ players: [createRoomMember({ id: "other" })] }),
    });

    expect(collectSessionReservationEntry(deps, "player-1")).toBeUndefined();
  });

  it("ゲームランタイムを解決できない場合は undefined を返すこと", () => {
    const deps = createDeps({
      room: createPlayingRoom(),
      hasGameManager: false,
    });

    expect(collectSessionReservationEntry(deps, "player-1")).toBeUndefined();
  });

  it("在籍情報が揃う場合は復帰予約の在籍情報を返すこと", () => {
    const deps = createDeps({ room: createPlayingRoom(), teamId: 2 });

    expect(collectSessionReservationEntry(deps, "player-1")).toEqual({
      playerId: "player-1",
      roomId: "room-1",
      playerName: "太郎",
      teamId: 2,
    });
  });

  it("チームIDはゲームセッション側の値を採ること", () => {
    const deps = createDeps({ room: createPlayingRoom(), teamId: 3 });

    expect(collectSessionReservationEntry(deps, "player-1")?.teamId).toBe(3);
  });

  it("チームID 0 のプレイヤーでも在籍情報を返すこと", () => {
    const deps = createDeps({ room: createPlayingRoom(), teamId: 0 });

    expect(collectSessionReservationEntry(deps, "player-1")?.teamId).toBe(0);
  });

  it("名簿上の表示名をそのまま載せること", () => {
    const deps = createDeps({
      room: createRoom({
        players: [createRoomMember({ id: "player-1", name: "花子" })],
      }),
    });

    expect(collectSessionReservationEntry(deps, "player-1")?.playerName).toBe(
      "花子",
    );
  });
});
