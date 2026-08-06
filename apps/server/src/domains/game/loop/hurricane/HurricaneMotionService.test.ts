/**
 * HurricaneMotionService.test
 * ハリケーン移動と境界反射の現行挙動を固定する characterization test
 * 直線移動・回転加算・境界クランプの境界値と異常値の扱いを検証する
 */
import { describe, expect, it } from "vitest";

import { config } from "@server/config";
import { HurricaneMotionService } from "./HurricaneMotionService";
import type { HurricaneState, MapGridSize } from "./hurricaneTypes";

const MAP_SIZE: MapGridSize = { gridCols: 10, gridRows: 8 };

/** テスト用のハリケーン状態を生成する */
const createHurricane = (
  overrides: Partial<HurricaneState> = {},
): HurricaneState => {
  return {
    id: "hurricane-1",
    x: 5,
    y: 4,
    vx: 0,
    vy: 0,
    radius: 1,
    rotationRad: 0,
    ...overrides,
  };
};

describe("HurricaneMotionService.update", () => {
  it("ハリケーンが存在しない場合でも例外を投げないこと", () => {
    const service = new HurricaneMotionService(MAP_SIZE);

    expect(() => service.update([], 0.05)).not.toThrow();
  });

  it("速度と経過秒に応じて座標を進めること", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const hurricane = createHurricane({ x: 5, y: 4, vx: 2, vy: -1 });

    service.update([hurricane], 0.5);

    expect(hurricane.x).toBeCloseTo(6, 10);
    expect(hurricane.y).toBeCloseTo(3.5, 10);
  });

  it("回転角を回転速度と経過秒の積だけ進めること", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const hurricane = createHurricane({ rotationRad: 1 });

    service.update([hurricane], 0.5);

    expect(hurricane.rotationRad).toBeCloseTo(
      1 + config.GAME_CONFIG.HURRICANE_VISUAL_ROTATION_SPEED * 0.5,
      10,
    );
  });

  it("経過秒が0の場合は座標と回転角を変えないこと", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const hurricane = createHurricane({ vx: 3, vy: 3, rotationRad: 0.7 });

    service.update([hurricane], 0);

    expect(hurricane.x).toBe(5);
    expect(hurricane.y).toBe(4);
    expect(hurricane.rotationRad).toBe(0.7);
  });

  it("左境界を越えた場合は半径位置へ戻して横速度を反転すること", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const hurricane = createHurricane({ x: 0.5, radius: 1, vx: -2 });

    service.update([hurricane], 0.5);

    expect(hurricane.x).toBe(1);
    expect(hurricane.vx).toBe(2);
  });

  it("右境界を越えた場合は半径分内側へ戻して横速度を反転すること", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const hurricane = createHurricane({ x: 9.5, radius: 1, vx: 2 });

    service.update([hurricane], 0.5);

    expect(hurricane.x).toBe(9);
    expect(hurricane.vx).toBe(-2);
  });

  it("上境界を越えた場合は半径位置へ戻して縦速度を反転すること", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const hurricane = createHurricane({ y: 0.5, radius: 1, vy: -2 });

    service.update([hurricane], 0.5);

    expect(hurricane.y).toBe(1);
    expect(hurricane.vy).toBe(2);
  });

  it("下境界を越えた場合は半径分内側へ戻して縦速度を反転すること", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const hurricane = createHurricane({ y: 7.5, radius: 1, vy: 2 });

    service.update([hurricane], 0.5);

    expect(hurricane.y).toBe(7);
    expect(hurricane.vy).toBe(-2);
  });

  it("左端にちょうど接する位置では反転しないこと", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const hurricane = createHurricane({ x: 2, radius: 1, vx: -1 });

    service.update([hurricane], 1);

    expect(hurricane.x).toBe(1);
    expect(hurricane.vx).toBe(-1);
  });

  it("右端にちょうど接する位置では反転しないこと", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const hurricane = createHurricane({ x: 8, radius: 1, vx: 1 });

    service.update([hurricane], 1);

    expect(hurricane.x).toBe(9);
    expect(hurricane.vx).toBe(1);
  });

  it("縦横同時に境界を越えた場合は両方の速度を反転すること", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const hurricane = createHurricane({
      x: 9.5,
      y: 0.5,
      radius: 1,
      vx: 2,
      vy: -2,
    });

    service.update([hurricane], 0.5);

    expect(hurricane.x).toBe(9);
    expect(hurricane.y).toBe(1);
    expect(hurricane.vx).toBe(-2);
    expect(hurricane.vy).toBe(2);
  });

  it("半径がマップより大きい場合はマップ外の半径位置へ配置すること", () => {
    const service = new HurricaneMotionService({ gridCols: 5, gridRows: 5 });
    const hurricane = createHurricane({ x: 2, y: 2, radius: 10, vx: 0, vy: 0 });

    service.update([hurricane], 1);

    expect(hurricane.x).toBe(10);
    expect(hurricane.y).toBe(10);
  });

  it("速度がNaNの場合は座標がNaNとなり反転もしないこと", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const hurricane = createHurricane({ vx: Number.NaN });

    service.update([hurricane], 0.5);

    expect(Number.isNaN(hurricane.x)).toBe(true);
    expect(Number.isNaN(hurricane.vx)).toBe(true);
  });

  it("複数のハリケーンをすべて更新すること", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const first = createHurricane({ id: "hurricane-1", x: 1, vx: 2 });
    const second = createHurricane({ id: "hurricane-2", x: 3, vx: -2 });

    service.update([first, second], 0.5);

    expect(first.x).toBe(2);
    expect(second.x).toBe(2);
  });

  it("渡された配列の要素を直接書き換え，戻り値を返さないこと", () => {
    const service = new HurricaneMotionService(MAP_SIZE);
    const hurricane = createHurricane({ vx: 2 });
    const hurricanes = [hurricane];

    const result = service.update(hurricanes, 1);

    expect(result).toBeUndefined();
    expect(hurricanes[0]).toBe(hurricane);
    expect(hurricane.x).toBe(7);
  });
});
