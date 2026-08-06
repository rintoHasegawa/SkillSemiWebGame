/**
 * readyForGameUseCase.test
 * 準備完了ユースケースの現行分岐挙動を固定する characterization test
 * ルーム未解決時の空応答と開始時刻有無による通知差を検証する
 */
import type { CurrentPlayersPayload, GameStartPayload, domain } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GameFieldConfig } from "../ports/gameUseCasePorts";
import { readyForGameUseCase } from "./readyForGameUseCase";

const FIXED_NOW_MS = 1_700_000_000_000;

type GameManagerStubParams = {
  roomPlayers?: domain.game.player.PlayerData[];
  startTime?: number;
  fieldConfig?: GameFieldConfig;
};

/** ルーム状態を固定した ReadyForGamePort スタブを生成する */
const createGameManagerStub = ({
  roomPlayers = [],
  startTime,
  fieldConfig,
}: GameManagerStubParams) => {
  return {
    getRoomPlayers: vi.fn<() => domain.game.player.PlayerData[]>(
      () => roomPlayers,
    ),
    getRoomStartTime: vi.fn<() => number | undefined>(() => startTime),
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

/** テスト用のプレイヤーデータを生成する */
const createPlayer = (
  id: string,
  x: number,
  y: number,
): domain.game.player.PlayerData => {
  return { id, name: `name-${id}`, x, y, teamId: 0 };
};

describe("readyForGameUseCase", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW_MS);
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
      gameManager: createGameManagerStub({ startTime: 1_000 }),
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
      roomPlayers: [createPlayer("socket-1", 1.234_5, 2.345_6)],
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

  it("開始時刻が未設定の場合はゲーム開始通知を送らないこと", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayer("socket-1", 1, 1)],
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishGameStartToSocket).not.toHaveBeenCalled();
  });

  it("開始時刻が0の場合は未開始として開始通知を送らないこと", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayer("socket-1", 1, 1)],
      startTime: 0,
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishGameStartToSocket).not.toHaveBeenCalled();
  });

  it("開始済みの場合はセッションのフィールド設定で開始通知を送ること", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayer("socket-1", 1, 1)],
      startTime: 1_234,
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
      startTime: 1_234,
      serverNow: FIXED_NOW_MS,
      fieldSizePreset: "SMALL",
      gridCols: 24,
      gridRows: 24,
    });
  });

  it("フィールド設定が未確定の場合は既定プリセットで開始通知を送ること", () => {
    const output = createOutputStub();
    const gameManager = createGameManagerStub({
      roomPlayers: [createPlayer("socket-1", 1, 1)],
      startTime: 1_234,
    });

    readyForGameUseCase({
      socketId: "socket-1",
      roomId: "room-1",
      gameManager,
      output,
    });

    expect(output.publishGameStartToSocket).toHaveBeenCalledWith({
      startTime: 1_234,
      serverNow: FIXED_NOW_MS,
      fieldSizePreset: "MEDIUM",
      gridCols: 36,
      gridRows: 36,
    });
  });
});
