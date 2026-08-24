/**
 * PlayerModel.test
 * クライアント側プレイヤー座標モデルのマップ境界クランプ仕様を検証する
 * サーバーと同一の境界式（プレイヤー半径ぶん内側）で収まることを検証する
 */
import { describe, expect, it } from "vitest";

import { config } from "@client/config";
import { domain } from "@repo/shared";

import { PlayerModel } from "./PlayerModel";

const { GRID_COLS, GRID_ROWS, PLAYER_RADIUS, PLAYER_SPEED }
  = config.GAME_CONFIG;

/** 指定座標のプレイヤーモデルを生成する */
const createModelAt = (x: number, y: number): PlayerModel => {
  return new PlayerModel({ id: "socket-1", name: "たろう", teamId: 0, x, y });
};

// 1秒ぶん移動しても届かない距離を確実に超えるためのフレーム数
const moveUntilStable = (
  model: PlayerModel,
  vx: number,
  vy: number,
): void => {
  const steps = Math.ceil((GRID_COLS + GRID_ROWS) / PLAYER_SPEED) + 1;

  for (let i = 0; i < steps; i += 1) {
    model.moveLocal(vx, vy, 1);
  }
};

describe("PlayerModel.moveLocal", () => {
  it("マップ範囲内の移動では座標をそのまま反映すること", () => {
    const model = createModelAt(5, 5);

    model.moveLocal(1, 0, 1);

    expect(model.getPosition().x).toBe(5 + PLAYER_SPEED);
  });

  it("右下方向へ移動し続けても上限を超えないこと", () => {
    const model = createModelAt(5, 5);

    moveUntilStable(model, 1, 1);

    expect(model.getPosition()).toEqual({
      x: GRID_COLS - PLAYER_RADIUS,
      y: GRID_ROWS - PLAYER_RADIUS,
    });
  });

  it("左上方向へ移動し続けても下限を下回らないこと", () => {
    const model = createModelAt(5, 5);

    moveUntilStable(model, -1, -1);

    expect(model.getPosition()).toEqual({
      x: PLAYER_RADIUS,
      y: PLAYER_RADIUS,
    });
  });

  it("非有限の入力では座標を更新しないこと", () => {
    const model = createModelAt(5, 5);

    model.moveLocal(Number.NaN, 0, 1);

    expect(model.getPosition()).toEqual({ x: 5, y: 5 });
  });

  it("サーバー側と同一の境界式でクランプすること", () => {
    const model = createModelAt(5, 5);

    moveUntilStable(model, 1, 1);

    expect(model.getPosition()).toEqual(
      domain.game.player.clampPositionToMapBounds(
        { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY },
        { gridCols: GRID_COLS, gridRows: GRID_ROWS },
      ),
    );
  });
});

describe("PlayerModel.resetToInitialPosition", () => {
  it("初期位置がマップ範囲内なら同じ座標へ戻すこと", () => {
    const model = createModelAt(4, 6);
    model.moveLocal(1, 1, 1);

    model.resetToInitialPosition();

    expect(model.getPosition()).toEqual({ x: 4, y: 6 });
  });

  it("初期位置がマップ範囲外でも境界内へ収めて戻すこと", () => {
    const model = createModelAt(-10, GRID_ROWS + 10);

    model.resetToInitialPosition();

    expect(model.getPosition()).toEqual({
      x: PLAYER_RADIUS,
      y: GRID_ROWS - PLAYER_RADIUS,
    });
  });
});

describe("PlayerModel.updateRemoteLerp", () => {
  const { PLAYER_LERP_SMOOTHNESS, FRAME_DELTA_MAX_MS } = config.GAME_CONFIG;

  it("画面内相当の deltaTime では係数 LERP_SMOOTHNESS×dt で補間すること", () => {
    const model = createModelAt(0, 0);
    model.setRemoteTarget({ x: 1, y: 1 });
    const deltaTime = FRAME_DELTA_MAX_MS / 1000;

    model.updateRemoteLerp(deltaTime);

    const expected = PLAYER_LERP_SMOOTHNESS * deltaTime;
    expect(model.getPosition().x).toBeCloseTo(expected, 10);
    expect(model.getPosition().y).toBeCloseTo(expected, 10);
  });

  it("画面外間引き相当の大きな deltaTime を繰り返しても発散せず目標へ収束すること", () => {
    const model = createModelAt(0, 0);
    model.setRemoteTarget({ x: 1, y: 1 });
    // 30fps × 間引き 6 フレームぶん（LERP_SMOOTHNESS×dt = 3.6 > 2 で不安定になる領域）
    const offscreenDeltaTime = (1 / 30) * 6;

    for (let i = 0; i < 30; i += 1) {
      model.updateRemoteLerp(offscreenDeltaTime);
    }

    const position = model.getPosition();
    expect(Number.isFinite(position.x)).toBe(true);
    expect(Number.isFinite(position.y)).toBe(true);
    expect(position.x).toBeCloseTo(1, 6);
    expect(position.y).toBeCloseTo(1, 6);
  });

  it("目標を行き過ぎて目標から遠ざからないこと", () => {
    const model = createModelAt(0, 0);
    model.setRemoteTarget({ x: 1, y: 0 });
    const offscreenDeltaTime = (FRAME_DELTA_MAX_MS / 1000) * 6;

    model.updateRemoteLerp(offscreenDeltaTime);

    const { x } = model.getPosition();
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(1);
  });
});
