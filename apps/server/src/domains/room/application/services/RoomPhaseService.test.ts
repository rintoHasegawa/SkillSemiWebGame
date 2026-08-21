/**
 * RoomPhaseService.test
 * ルームフェーズ遷移サービスの現行挙動を固定する characterization test
 * status ユニオン（updated/not_found/invalid_transition）の全分岐を検証する
 */
import { domain } from "@repo/shared";
import { describe, expect, it } from "vitest";

import { createRoom } from "@server/testing/roomFixtures";
import { RoomPhaseService } from "./RoomPhaseService";

/** 指定フェーズのルーム1件を持つサービスを生成する */
const createService = (status: domain.room.Room["status"]) => {
  const room = createRoom({ status });
  return {
    room,
    service: new RoomPhaseService(new Map([["room-1", room]])),
  };
};

describe("RoomPhaseService", () => {
  it("存在しないルームのプレイ開始はnot_foundを返すこと", () => {
    const service = new RoomPhaseService(new Map());

    expect(service.markRoomPlaying("room-x")).toEqual({ status: "not_found" });
  });

  it("待機中ルームのプレイ開始はupdatedを返すこと", () => {
    const { service } = createService(domain.room.RoomPhase.WAITING);

    expect(service.markRoomPlaying("room-1").status).toBe("updated");
  });

  it("プレイ開始時にルームフェーズをplayingへ更新すること", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    service.markRoomPlaying("room-1");

    expect(room.status).toBe(domain.room.RoomPhase.PLAYING);
  });

  it("既にプレイ中のルームはinvalid_transitionを返すこと", () => {
    const { service } = createService(domain.room.RoomPhase.PLAYING);

    expect(service.markRoomPlaying("room-1")).toEqual({
      status: "invalid_transition",
    });
  });

  it("リザルト中ルームのプレイ開始は許可すること", () => {
    const { service } = createService(domain.room.RoomPhase.RESULT);

    expect(service.markRoomPlaying("room-1").status).toBe("updated");
  });

  it("存在しないルームの待機復帰はnot_foundを返すこと", () => {
    const service = new RoomPhaseService(new Map());

    expect(service.markRoomWaiting("room-x")).toEqual({ status: "not_found" });
  });

  it("プレイ中ルームの待機復帰はupdatedを返すこと", () => {
    const { service } = createService(domain.room.RoomPhase.PLAYING);

    expect(service.markRoomWaiting("room-1").status).toBe("updated");
  });

  it("待機復帰時にルームフェーズをwaitingへ更新すること", () => {
    const { room, service } = createService(domain.room.RoomPhase.PLAYING);

    service.markRoomWaiting("room-1");

    expect(room.status).toBe(domain.room.RoomPhase.WAITING);
  });

  it("既に待機中のルームはinvalid_transitionを返すこと", () => {
    const { service } = createService(domain.room.RoomPhase.WAITING);

    expect(service.markRoomWaiting("room-1")).toEqual({
      status: "invalid_transition",
    });
  });

  it("更新成功時は対象ルーム参照を返すこと", () => {
    const { room, service } = createService(domain.room.RoomPhase.WAITING);

    const result = service.markRoomPlaying("room-1");

    expect(result.status === "updated" && result.room).toBe(room);
  });
});
