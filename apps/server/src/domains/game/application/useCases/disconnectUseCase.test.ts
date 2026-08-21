/**
 * disconnectUseCase.test
 * 切断ユースケースの現行分岐挙動を固定する characterization test
 * Bot引き継ぎ成否とroomId有無の組み合わせを検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import { disconnectUseCase } from "./disconnectUseCase";

/** Bot引き継ぎ結果を固定した DisconnectPlayerPort スタブを生成する */
const createGameManagerStub = (replacedWithBot: boolean) => {
  return {
    removePlayer: vi.fn<(id: string) => void>(),
    replaceDisconnectedPlayerWithBot: vi.fn<(id: string) => boolean>(
      () => replacedWithBot,
    ),
  };
};

/** 送信内容を記録する出力ポートスタブを生成する */
const createOutputStub = () => {
  return {
    publishPlayerRemovedToRoom: vi.fn<
      (roomId: string, removedPlayerId: string) => void
    >(),
  };
};

let logSpy: ReturnType<typeof vi.spyOn>;

describe("disconnectUseCase", () => {
  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Bot引き継ぎに成功した場合はプレイヤーを削除しないこと", () => {
    const gameManager = createGameManagerStub(true);
    const output = createOutputStub();

    disconnectUseCase({
      gameManager,
      roomId: "room-1",
      playerId: "socket-1",
      output,
    });

    expect(gameManager.removePlayer).not.toHaveBeenCalled();
  });

  it("Bot引き継ぎに成功した場合は退出通知を配信しないこと", () => {
    const gameManager = createGameManagerStub(true);
    const output = createOutputStub();

    disconnectUseCase({
      gameManager,
      roomId: "room-1",
      playerId: "socket-1",
      output,
    });

    expect(output.publishPlayerRemovedToRoom).not.toHaveBeenCalled();
  });

  it("Bot引き継ぎに失敗した場合はプレイヤーを削除すること", () => {
    const gameManager = createGameManagerStub(false);
    const output = createOutputStub();

    disconnectUseCase({
      gameManager,
      roomId: "room-1",
      playerId: "socket-1",
      output,
    });

    expect(gameManager.removePlayer).toHaveBeenCalledWith("socket-1");
  });

  it("Bot引き継ぎに失敗しroomIdがある場合は退出通知を配信すること", () => {
    const gameManager = createGameManagerStub(false);
    const output = createOutputStub();

    disconnectUseCase({
      gameManager,
      roomId: "room-1",
      playerId: "socket-1",
      output,
    });

    expect(output.publishPlayerRemovedToRoom).toHaveBeenCalledWith(
      "room-1",
      "socket-1",
    );
  });

  it("roomIdが未指定の場合は退出通知を配信しないこと", () => {
    const gameManager = createGameManagerStub(false);
    const output = createOutputStub();

    disconnectUseCase({
      gameManager,
      playerId: "socket-1",
      output,
    });

    expect(output.publishPlayerRemovedToRoom).not.toHaveBeenCalled();
  });

  it("roomIdが空文字の場合は退出通知を配信しないこと", () => {
    const gameManager = createGameManagerStub(false);
    const output = createOutputStub();

    disconnectUseCase({
      gameManager,
      roomId: "",
      playerId: "socket-1",
      output,
    });

    expect(output.publishPlayerRemovedToRoom).not.toHaveBeenCalled();
  });

  it("roomIdが空文字でもプレイヤー削除は実行すること", () => {
    const gameManager = createGameManagerStub(false);
    const output = createOutputStub();

    disconnectUseCase({
      gameManager,
      roomId: "",
      playerId: "socket-1",
      output,
    });

    expect(gameManager.removePlayer).toHaveBeenCalledWith("socket-1");
  });

  it("roomIdが未指定でもプレイヤー削除は実行すること", () => {
    const gameManager = createGameManagerStub(false);
    const output = createOutputStub();

    disconnectUseCase({
      gameManager,
      playerId: "socket-1",
      output,
    });

    expect(gameManager.removePlayer).toHaveBeenCalledWith("socket-1");
  });

  it("roomIdが未指定の場合は配信先不明として記録すること", () => {
    const output = createOutputStub();

    disconnectUseCase({
      gameManager: createGameManagerStub(false),
      playerId: "socket-1",
      output,
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.DISCONNECT,
      result: logResults.IGNORED_MISSING_ROOM,
      socketId: "socket-1",
    });
  });

  it("roomIdが未指定でも削除完了のログは記録すること", () => {
    const output = createOutputStub();

    disconnectUseCase({
      gameManager: createGameManagerStub(false),
      playerId: "socket-1",
      output,
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.DISCONNECT,
      result: logResults.PLAYER_REMOVED,
      socketId: "socket-1",
      replacedWithBot: false,
    });
  });

  it("roomIdがある場合は配信先不明のログを記録しないこと", () => {
    const output = createOutputStub();

    disconnectUseCase({
      gameManager: createGameManagerStub(false),
      roomId: "room-1",
      playerId: "socket-1",
      output,
    });

    expect(logSpy).not.toHaveBeenCalledWith(
      `[${logScopes.GAME_USE_CASE}]`,
      expect.objectContaining({ result: logResults.IGNORED_MISSING_ROOM }),
    );
  });

  it("Bot引き継ぎに成功した場合はroomId未指定でも配信先不明のログを記録しないこと", () => {
    const output = createOutputStub();

    disconnectUseCase({
      gameManager: createGameManagerStub(true),
      playerId: "socket-1",
      output,
    });

    expect(logSpy).not.toHaveBeenCalledWith(
      `[${logScopes.GAME_USE_CASE}]`,
      expect.objectContaining({ result: logResults.IGNORED_MISSING_ROOM }),
    );
  });
});
