/**
 * movePlayerUseCase.test
 * 移動ユースケースの現行委譲挙動を固定する characterization test
 * 座標検証を行わずそのまま委譲する点を検証する
 */
import { describe, expect, it, vi } from "vitest";

import { movePlayerUseCase } from "./movePlayerUseCase";

/** 移動委譲先の MovePlayerPort スタブを生成する */
const createGameManagerStub = () => {
  return {
    movePlayer: vi.fn<(id: string, x: number, y: number) => void>(),
  };
};

describe("movePlayerUseCase", () => {
  it("移動座標をゲーム管理へそのまま委譲すること", () => {
    const gameManager = createGameManagerStub();

    movePlayerUseCase({
      gameManager,
      playerId: "socket-1",
      move: { x: 1.5, y: 2.25 },
    });

    expect(gameManager.movePlayer).toHaveBeenCalledWith("socket-1", 1.5, 2.25);
  });

  it("原点座標もそのまま委譲すること", () => {
    const gameManager = createGameManagerStub();

    movePlayerUseCase({
      gameManager,
      playerId: "socket-1",
      move: { x: 0, y: 0 },
    });

    expect(gameManager.movePlayer).toHaveBeenCalledWith("socket-1", 0, 0);
  });

  it("負座標を検証せずそのまま委譲すること", () => {
    const gameManager = createGameManagerStub();

    movePlayerUseCase({
      gameManager,
      playerId: "socket-1",
      move: { x: -10, y: -10 },
    });

    expect(gameManager.movePlayer).toHaveBeenCalledWith("socket-1", -10, -10);
  });

  it("非有限座標を検証せずそのまま委譲すること", () => {
    const gameManager = createGameManagerStub();

    movePlayerUseCase({
      gameManager,
      playerId: "socket-1",
      move: { x: Number.NaN, y: Number.POSITIVE_INFINITY },
    });

    expect(gameManager.movePlayer).toHaveBeenCalledWith(
      "socket-1",
      Number.NaN,
      Number.POSITIVE_INFINITY,
    );
  });

  it("移動委譲を1回だけ実行すること", () => {
    const gameManager = createGameManagerStub();

    movePlayerUseCase({
      gameManager,
      playerId: "socket-1",
      move: { x: 1, y: 1 },
    });

    expect(gameManager.movePlayer).toHaveBeenCalledTimes(1);
  });
});
