/**
 * readyForGameUseCase.test
 * 準備完了ユースケースの分岐挙動を検証するユニットテスト
 * ルーム未解決時の空応答と，セッション進行有無による通知差を検証する
 * 開始判定は符号付きゲーム経過msの undefined のみで行い，負値は開始済みとして扱う
 * 進行中セッションへの合流時はマップ全体の塗り状態を単一ソケットへ配信する
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
  /** マップ全セルの塗り状態（-1 は未塗装） */
  gridColors?: readonly number[];
};

/** ルーム状態を固定した ReadyForGamePort スタブを生成する */
const createGameManagerStub = ({
  roomPlayers = [],
  signedElapsedMs,
  fieldConfig,
  gridColors = [],
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
    getMapGridColorsView: vi.fn<() => readonly number[]>(() => gridColors),
  };
};

/** 送信内容を記録する出力ポートスタブを生成する */
const createOutputStub = () => {
  return {
    publishCurrentPlayersToSocket: vi.fn<
      (players: CurrentPlayersPayload) => void
    >(),
    publishGameStartToSocket: vi.fn<(payload: GameStartPayload) => void>(),
    publishMapCellsToSocket: vi.fn<
      (cellUpdates: domain.game.gridMap.CellUpdate[]) => void
    >(),
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
      roomId: "room-1",
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
      roomId: "room-1",
      serverElapsedMs: 1_234,
      fieldSizePreset: "MEDIUM",
      gridCols: 36,
      gridRows: 36,
    });
  });
  it("進行中セッションでは現在のマップ塗り状態を単一ソケットへ配信すること", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      signedElapsedMs: 1_000,
      gridColors: [0, 1],
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishMapCellsToSocket).toHaveBeenCalledWith([
      { index: 0, teamId: 0 },
      { index: 1, teamId: 1 },
    ]);
  });

  it("マップ配信では未塗装セルを含めないこと", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      signedElapsedMs: 1_000,
      gridColors: [-1, 2, -1],
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishMapCellsToSocket).toHaveBeenCalledWith([
      { index: 1, teamId: 2 },
    ]);
  });

  it("全セルが未塗装の場合はマップ配信を行わないこと", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      signedElapsedMs: 1_000,
      gridColors: [-1, -1],
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishMapCellsToSocket).not.toHaveBeenCalled();
  });

  it("カウントダウン中でもマップ配信を行うこと", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      signedElapsedMs: -2_000,
      gridColors: [3],
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishMapCellsToSocket).toHaveBeenCalledWith([
      { index: 0, teamId: 3 },
    ]);
  });

  it("セッション未開始の場合はマップ配信を行わないこと", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({ gridColors: [0, 1] });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishMapCellsToSocket).not.toHaveBeenCalled();
  });

  it("ルームを解決できない場合はマップ配信を行わないこと", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      signedElapsedMs: 1_000,
      gridColors: [0],
    });

    readyForGameUseCase({
      socketId: "socket-1",
      gameManager,
      output,
    });

    expect(output.publishMapCellsToSocket).not.toHaveBeenCalled();
  });

  it("マップ配信はゲーム開始通知より後に行うこと", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      signedElapsedMs: 1_000,
      gridColors: [0],
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(
      output.publishGameStartToSocket.mock.invocationCallOrder[0],
    ).toBeLessThan(output.publishMapCellsToSocket.mock.invocationCallOrder[0]);
  });
});
