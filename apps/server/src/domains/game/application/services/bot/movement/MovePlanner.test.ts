/**
 * MovePlanner.test
 * Bot移動計算の現行挙動を固定する characterization test
 * 到達判定の境界とマップ端クランプを検証する
 */
import { describe, expect, it } from "vitest";

import { moveTowardsTarget } from "./MovePlanner";

const size = { gridCols: 6, gridRows: 6 };

describe("moveTowardsTarget", () => {
  it("目標セル中心に到達済みなら中心座標を返すこと", () => {
    expect(moveTowardsTarget(2.5, 3.5, 2, 3, size)).toEqual({
      nextX: 2.5,
      nextY: 3.5,
    });
  });

  it("1ステップ以内の距離なら目標セル中心へ吸着すること", () => {
    const result = moveTowardsTarget(2.4, 3.5, 2, 3, size);

    expect(result).toEqual({ nextX: 2.5, nextY: 3.5 });
  });

  it("1ステップより遠い場合は目標方向へ一定距離だけ進むこと", () => {
    const result = moveTowardsTarget(0.5, 0.5, 5, 0, size);

    expect(result.nextX).toBeCloseTo(0.65, 5);
  });

  it("軸方向が一致している場合はもう一方の座標を変えないこと", () => {
    const result = moveTowardsTarget(0.5, 0.5, 5, 0, size);

    expect(result.nextY).toBeCloseTo(0.5, 5);
  });

  it("マップ右端を超える移動は端の内側へクランプすること", () => {
    const result = moveTowardsTarget(5.9, 0.5, 100, 0, size);

    expect(result.nextX).toBeCloseTo(5.999, 5);
  });

  it("マップ左端を超える移動は0へクランプすること", () => {
    const result = moveTowardsTarget(0.05, 0.5, -100, 0, size);

    expect(result.nextX).toBe(0);
  });

  it("斜め方向でも1ステップ分の距離だけ進むこと", () => {
    const result = moveTowardsTarget(0.5, 0.5, 5, 5, size);
    const movedDistance = Math.hypot(result.nextX - 0.5, result.nextY - 0.5);

    expect(movedDistance).toBeCloseTo(0.15, 5);
  });
});
