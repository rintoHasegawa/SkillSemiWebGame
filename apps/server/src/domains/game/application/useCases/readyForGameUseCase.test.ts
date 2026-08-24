/**
 * readyForGameUseCase.test
 * 準備完了ユースケースの分岐挙動を検証するユニットテスト
 * ルーム未解決時の空応答と，セッション進行有無による通知差を検証する
 * 開始判定は符号付きゲーム経過msの undefined のみで行い，負値は開始済みとして扱う
 */
import type { CurrentPlayersPayload, GameStartPayload, domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameFieldConfig } from "../ports/gameUseCasePorts";
import { createPlayerData } from "@server/testing/playerFixtures";
import { readyForGameUseCase } from "./readyForGameUseCase";

type GameManagerStubParams = {
  roomPlayers?: domain.game.player.PlayerData[];
  /** 進行中セッションの符号付きゲーム経過ms（未開始は undefined） */
  signedElapsedMs?: number;
  fieldConfig?: GameFieldConfig;
};

/** ルーム状態を固定した ReadyForGamePort スタブを生成する */
const createGameManagerStub = ({
  roomPlayers = [],
  signedElapsedMs,
  fieldConfig,
}: GameManagerStubParams) => {
  return {
    getRoomPlayers: vi.fn<() => domain.game.player.PlayerData[]>(
      () => roomPlayers,
    ),
    getRoomSignedElapsedMs: vi.fn<() => number | undefined>(
      () => signedElapsedMs,
    ),
    getRoomFieldConfig: vi.fn<() => GameFieldConfig | undefined>(
      () => fieldConfig,
    ),
  };
};

/** 送信内容を記録する出力ポートスタブを生成する */
const createOutputStub = () => {
  return {
    publishCurrentPlayersToSocket: vi.fn<
      (players: CurrentPlayersPayload) => void
    >(),
    publishGameStartToSocket: vi.fn<(payload: GameStartPayload) => void>(),
  };
};

describe("readyForGameUseCase", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("roomIdが未指定の場合は空のプレイヤー一覧を返すこと", () => {
    const output = createOutputStub();

    readyForGameUseCase({
      socketId: "socket-1",
      gameManager: createGameManagerStub({}),
      output,
    });

    expect(output.publishCurrentPlayersToSocket).toHaveBeenCalledWith([]);
  });

  it("roomIdが未指定の場合はゲーム開始通知を送らないこと", () => {
    const output = createOutputStub();

    readyForGameUseCase({
      socketId: "socket-1",
      gameManager: createGameManagerStub({ signedElapsedMs: 1_000 }),
      output,
    });

    expect(output.publishGameStartToSocket).not.toHaveBeenCalled();
  });

  it("gameManagerが未指定の場合は空のプレイヤー一覧を返すこと", () => {
    const output = createOutputStub();

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      output,
    });

    expect(output.publishCurrentPlayersToSocket).toHaveBeenCalledWith([]);
  });

  it("ルーム解決済みの場合はブートストラップ済みプレイヤー一覧を返すこと", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayerData("socket-1", { x: 1.234_5, y: 2.345_6 })],
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishCurrentPlayersToSocket).toHaveBeenCalledWith([
      { id: "socket-1", name: "name-socket-1", teamId: 0, x: 1.23, y: 2.35 },
    ]);
  });

  it("セッション未開始の場合はゲーム開始通知を送らないこと", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayerData("socket-1", { x: 1, y: 1 })],
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishGameStartToSocket).not.toHaveBeenCalled();
  });

  it("経過msが0の場合も開始済みとして開始通知を送ること", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayerData("socket-1", { x: 1, y: 1 })],
      signedElapsedMs: 0,
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishGameStartToSocket).toHaveBeenCalledWith(
      expect.objectContaining({ serverElapsedMs: 0 }),
    );
  });

  it("カウントダウン中は負の経過msで開始通知を送ること", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayerData("socket-1", { x: 1, y: 1 })],
      signedElapsedMs: -3_000,
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishGameStartToSocket).toHaveBeenCalledWith(
      expect.objectContaining({ serverElapsedMs: -3_000 }),
    );
  });

  it("開始済みの場合はセッションのフィールド設定で開始通知を送ること", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayerData("socket-1", { x: 1, y: 1 })],
      signedElapsedMs: 1_234,
      fieldConfig: {
        fieldSizePreset: "SMALL",
        gridCols: 24,
        gridRows: 24,
      },
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishGameStartToSocket).toHaveBeenCalledWith({
      serverElapsedMs: 1_234,
      fieldSizePreset: "SMALL",
      gridCols: 24,
      gridRows: 24,
    });
  });

  it("フィールド設定が未確定の場合は既定プリセットで開始通知を送ること", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayerData("socket-1", { x: 1, y: 1 })],
      signedElapsedMs: 1_234,
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishGameStartToSocket).toHaveBeenCalledWith({
      serverElapsedMs: 1_234,
      fieldSizePreset: "MEDIUM",
      gridCols: 36,
      gridRows: 36,
    });
  });
});
