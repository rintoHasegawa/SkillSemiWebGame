/**
 * RoomTeamService.test
 * チーム選択サービスの現行挙動を固定する characterization test
 * status ユニオン（ok/team_full/not_found）の全分岐と上限境界を検証する
 */
import { domain } from "@repo/shared";
import { describe, expect, it } from "vitest";

import { RoomQueryService } from "./RoomQueryService";
import { RoomTeamService } from "./RoomTeamService";

type MemberSeed = {
  id: string;
  preferredTeamId: number | null;
};

/** テスト用のルームメンバーを生成する */
const createMember = ({
  id,
  preferredTeamId,
}: MemberSeed): domain.room.RoomMember => {
  return {
    id,
    name: `name-${id}`,
    isOwner: false,
    isReady: false,
    preferredTeamId,
  };
};

type ServiceSeed = {
  status?: domain.room.Room["status"];
  members?: MemberSeed[];
  targetPlayerCount?: number;
  maxPlayers?: number;
};

/** 指定条件のルーム1件を持つチーム選択サービスを生成する */
const createService = ({
  status = domain.room.RoomPhase.WAITING,
  members = [{ id: "socket-1", preferredTeamId: null }],
  targetPlayerCount,
  maxPlayers = 8,
}: ServiceSeed = {}) => {
  const room: domain.room.Room = {
    roomId: "room-1",
    ownerId: "socket-1",
    players: members.map((member) => createMember(member)),
    status,
    maxPlayers,
    fieldSizePreset: "MEDIUM",
    teamAssignmentMode: "player_select",
    ...(targetPlayerCount === undefined ? {} : { targetPlayerCount }),
  };
  const rooms = new Map([["room-1", room]]);

  return {
    room,
    service: new RoomTeamService(new RoomQueryService(rooms)),
  };
};

describe("RoomTeamService", () => {
  it("所属ルームがない場合はnot_foundを返すこと", () => {
    const { service } = createService();

    expect(service.selectTeam("socket-9", 0)).toEqual({ status: "not_found" });
  });

  it("待機中でないルームではnot_foundを返すこと", () => {
    const { service } = createService({
      status: domain.room.RoomPhase.PLAYING,
    });

    expect(service.selectTeam("socket-1", 0)).toEqual({ status: "not_found" });
  });

  it("チーム選択に成功した場合はokを返すこと", () => {
    const { service } = createService({ targetPlayerCount: 8 });

    expect(service.selectTeam("socket-1", 0).status).toBe("ok");
  });

  it("チーム選択に成功した場合は希望チームIDを保存すること", () => {
    const { room, service } = createService({ targetPlayerCount: 8 });

    service.selectTeam("socket-1", 2);

    expect(room.players[0]?.preferredTeamId).toBe(2);
  });

  it("チーム希望をnullへ戻す場合は上限判定せずokを返すこと", () => {
    const { service } = createService({ targetPlayerCount: 0 });

    expect(service.selectTeam("socket-1", null).status).toBe("ok");
  });

  it("チーム人数が上限に達している場合はteam_fullを返すこと", () => {
    const { service } = createService({
      targetPlayerCount: 8,
      members: [
        { id: "socket-1", preferredTeamId: null },
        { id: "socket-2", preferredTeamId: 1 },
        { id: "socket-3", preferredTeamId: 1 },
      ],
    });

    expect(service.selectTeam("socket-1", 1)).toEqual({
      status: "team_full",
      teamId: 1,
    });
  });

  it("上限未満のチームには参加できること", () => {
    const { service } = createService({
      targetPlayerCount: 8,
      members: [
        { id: "socket-1", preferredTeamId: null },
        { id: "socket-2", preferredTeamId: 1 },
      ],
    });

    expect(service.selectTeam("socket-1", 1).status).toBe("ok");
  });

  it("自分の既存選択は上限計算から除外すること", () => {
    const { service } = createService({
      targetPlayerCount: 8,
      members: [
        { id: "socket-1", preferredTeamId: 1 },
        { id: "socket-2", preferredTeamId: 1 },
      ],
    });

    expect(service.selectTeam("socket-1", 1).status).toBe("ok");
  });

  it("ゲーム人数未設定の場合は最大人数から上限を算出すること", () => {
    const { service } = createService({
      maxPlayers: 4,
      members: [
        { id: "socket-1", preferredTeamId: null },
        { id: "socket-2", preferredTeamId: 3 },
      ],
    });

    expect(service.selectTeam("socket-1", 3)).toEqual({
      status: "team_full",
      teamId: 3,
    });
  });

  it("ゲーム人数が4未満の場合はどのチームもteam_fullになること", () => {
    const { service } = createService({ targetPlayerCount: 2 });

    expect(service.selectTeam("socket-1", 0)).toEqual({
      status: "team_full",
      teamId: 0,
    });
  });

  it("チーム上限を超える値の指定でも上限判定のみで扱うこと", () => {
    const { room, service } = createService({ targetPlayerCount: 8 });

    service.selectTeam("socket-1", 99);

    expect(room.players[0]?.preferredTeamId).toBe(99);
  });
});
