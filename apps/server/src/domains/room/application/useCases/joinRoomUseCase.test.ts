/**
 * joinRoomUseCase.test
 * ルーム参加ユースケースの現行挙動を固定する characterization test
 * status ユニオン（joined/duplicate/full/playing）の全分岐を検証する
 */
import { domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRoom } from "@server/testing/roomFixtures";
import type { JoinRoomResult } from "../ports/roomUseCasePorts";
import { joinRoomUseCase } from "./joinRoomUseCase";

/** 参加結果を固定した JoinRoomPort スタブを生成する */
const createRoomManagerStub = (status: JoinRoomResult["status"]) => {
  const room = createRoom();

  return {
    room,
    addPlayerToRoom: vi.fn<
      (roomId: string, socketId: string, playerName: string) => JoinRoomResult
    >(() => ({ room, status })),
  };
};

/** ランタイム確保呼び出しを記録するポートスタブを生成する */
const createRuntimeRegistryStub = () => {
  return {
    ensureGameManagerForRoom: vi.fn<(roomId: string) => void>(),
  };
};

/** 参加拒否通知を記録する出力ポートスタブを生成する */
const createOutputStub = () => {
  return {
    publishJoinRejectedToSocket: vi.fn<
      (payload: domain.room.JoinRoomRejectedPayload) => void
    >(),
  };
};

const data: domain.room.JoinRoomPayload = {
  roomId: "room-1",
  playerName: "太郎",
};

describe("joinRoomUseCase", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("参加要求をルーム管理へ委譲すること", () => {
    const roomManager = createRoomManagerStub("joined");
    const runtimeRegistry = createRuntimeRegistryStub();

    joinRoomUseCase({
      roomManager,
      runtimeRegistry,
      socketId: "socket-1",
      data,
      output: createOutputStub(),
    });

    expect(roomManager.addPlayerToRoom).toHaveBeenCalledWith(
      "room-1",
      "socket-1",
      "太郎",
    );
  });

  it("参加成功時はゲームランタイムを確保すること", () => {
    const roomManager = createRoomManagerStub("joined");
    const runtimeRegistry = createRuntimeRegistryStub();

    joinRoomUseCase({
      roomManager,
      runtimeRegistry,
      socketId: "socket-1",
      data,
      output: createOutputStub(),
    });

    expect(runtimeRegistry.ensureGameManagerForRoom).toHaveBeenCalledWith(
      "room-1",
    );
  });

  it("参加成功時は拒否通知を送らないこと", () => {
    const output = createOutputStub();

    joinRoomUseCase({
      roomManager: createRoomManagerStub("joined"),
      runtimeRegistry: createRuntimeRegistryStub(),
      socketId: "socket-1",
      data,
      output,
    });

    expect(output.publishJoinRejectedToSocket).not.toHaveBeenCalled();
  });

  it("参加成功時は参加結果をそのまま返すこと", () => {
    const roomManager = createRoomManagerStub("joined");

    const result = joinRoomUseCase({
      roomManager,
      runtimeRegistry: createRuntimeRegistryStub(),
      socketId: "socket-1",
      data,
      output: createOutputStub(),
    });

    expect(result).toEqual({ room: roomManager.room, status: "joined" });
  });

  it("重複参加時は理由duplicateで拒否通知を送ること", () => {
    const output = createOutputStub();

    joinRoomUseCase({
      roomManager: createRoomManagerStub("duplicate"),
      runtimeRegistry: createRuntimeRegistryStub(),
      socketId: "socket-1",
      data,
      output,
    });

    expect(output.publishJoinRejectedToSocket).toHaveBeenCalledWith({
      roomId: "room-1",
      reason: "duplicate",
    });
  });

  it("重複参加時はゲームランタイムを確保しないこと", () => {
    const runtimeRegistry = createRuntimeRegistryStub();

    joinRoomUseCase({
      roomManager: createRoomManagerStub("duplicate"),
      runtimeRegistry,
      socketId: "socket-1",
      data,
      output: createOutputStub(),
    });

    expect(runtimeRegistry.ensureGameManagerForRoom).not.toHaveBeenCalled();
  });

  it("満員時は理由fullで拒否通知を送ること", () => {
    const output = createOutputStub();

    joinRoomUseCase({
      roomManager: createRoomManagerStub("full"),
      runtimeRegistry: createRuntimeRegistryStub(),
      socketId: "socket-1",
      data,
      output,
    });

    expect(output.publishJoinRejectedToSocket).toHaveBeenCalledWith({
      roomId: "room-1",
      reason: "full",
    });
  });

  it("満員時はゲームランタイムを確保しないこと", () => {
    const runtimeRegistry = createRuntimeRegistryStub();

    joinRoomUseCase({
      roomManager: createRoomManagerStub("full"),
      runtimeRegistry,
      socketId: "socket-1",
      data,
      output: createOutputStub(),
    });

    expect(runtimeRegistry.ensureGameManagerForRoom).not.toHaveBeenCalled();
  });

  it("ゲーム中は理由playingで拒否通知を送ること", () => {
    const output = createOutputStub();

    joinRoomUseCase({
      roomManager: createRoomManagerStub("playing"),
      runtimeRegistry: createRuntimeRegistryStub(),
      socketId: "socket-1",
      data,
      output,
    });

    expect(output.publishJoinRejectedToSocket).toHaveBeenCalledWith({
      roomId: "room-1",
      reason: "playing",
    });
  });

  it("ゲーム中は拒否時の参加結果をそのまま返すこと", () => {
    const roomManager = createRoomManagerStub("playing");

    const result = joinRoomUseCase({
      roomManager,
      runtimeRegistry: createRuntimeRegistryStub(),
      socketId: "socket-1",
      data,
      output: createOutputStub(),
    });

    expect(result).toEqual({ room: roomManager.room, status: "playing" });
  });
});
