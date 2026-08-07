/**
 * collision.logic.test
 * チーム概念を持たない円同士の重なり判定を検証する
 * 「2円は中心間距離が半径の和より小さいとき重なる」定義を基準に境界値を確認する
 */
import { describe, expect, it } from "vitest";

import type { CollisionCircle } from "./collision.type";
import { checkCircleOverlap } from "./collision.logic";

const createCircle = (
  overrides: Partial<CollisionCircle> = {},
): CollisionCircle => ({
  x: 0,
  y: 0,
  radius: 1,
  ...overrides,
});

describe("checkCircleOverlap", () => {
  it("中心が完全に一致する2円を重なりと判定すること", () => {
    const result = checkCircleOverlap({
      circleA: createCircle(),
      circleB: createCircle(),
    });

    expect(result.isOverlapping).toBe(true);
  });

  it("中心間距離が半径の和より小さい場合に重なりと判定すること", () => {
    const result = checkCircleOverlap({
      circleA: createCircle({ radius: 1.5 }),
      circleB: createCircle({ x: 1.5, radius: 0.5 }),
    });

    expect(result.isOverlapping).toBe(true);
  });

  it("中心間距離が半径の和より大きい場合に重なりと判定しないこと", () => {
    const result = checkCircleOverlap({
      circleA: createCircle({ radius: 1.5 }),
      circleB: createCircle({ x: 3, radius: 0.5 }),
    });

    expect(result.isOverlapping).toBe(false);
  });

  it("中心間距離が半径の和とちょうど等しい場合は接触のみのため重なりと判定しないこと", () => {
    const result = checkCircleOverlap({
      circleA: createCircle({ radius: 1.5 }),
      circleB: createCircle({ x: 2, radius: 0.5 }),
    });

    expect(result.isOverlapping).toBe(false);
  });

  it("中心間距離が半径の和をわずかに下回る場合に重なりと判定すること", () => {
    const result = checkCircleOverlap({
      circleA: createCircle({ radius: 1.5 }),
      circleB: createCircle({ x: 1.999, radius: 0.5 }),
    });

    expect(result.isOverlapping).toBe(true);
  });

  it("中心間距離が半径の和をわずかに上回る場合に重なりと判定しないこと", () => {
    const result = checkCircleOverlap({
      circleA: createCircle({ radius: 1.5 }),
      circleB: createCircle({ x: 2.001, radius: 0.5 }),
    });

    expect(result.isOverlapping).toBe(false);
  });

  it("中心間距離の二乗を distanceSquared として返すこと", () => {
    const result = checkCircleOverlap({
      circleA: createCircle(),
      circleB: createCircle({ x: 3, y: 4 }),
    });

    expect(result.distanceSquared).toBe(25);
  });

  it("半径の和の二乗を thresholdSquared として返すこと", () => {
    const result = checkCircleOverlap({
      circleA: createCircle({ radius: 1.5 }),
      circleB: createCircle({ radius: 0.5 }),
    });

    expect(result.thresholdSquared).toBe(4);
  });

  it("負方向の座標差でも距離の二乗が正の値になること", () => {
    const result = checkCircleOverlap({
      circleA: createCircle(),
      circleB: createCircle({ x: -3, y: -4 }),
    });

    expect(result.distanceSquared).toBe(25);
  });

  it("負座標同士でも中心間距離の二乗を正しく求めること", () => {
    const result = checkCircleOverlap({
      circleA: createCircle({ x: -5, y: -5 }),
      circleB: createCircle({ x: -2, y: -1 }),
    });

    expect(result.distanceSquared).toBe(25);
  });

  it("斜め方向の距離を各軸の二乗和で評価すること", () => {
    const result = checkCircleOverlap({
      circleA: createCircle(),
      circleB: createCircle({ x: 1, y: 1 }),
    });

    expect(result.distanceSquared).toBe(2);
    expect(result.isOverlapping).toBe(true);
  });

  it("引数の順序を入れ替えても同じ判定結果になること", () => {
    const circleA = createCircle({ x: 1, y: 2, radius: 1.5 });
    const circleB = createCircle({ x: 2, y: 4, radius: 0.5 });

    expect(checkCircleOverlap({ circleA, circleB })).toEqual(
      checkCircleOverlap({ circleA: circleB, circleB: circleA }),
    );
  });

  it("半径が0の円同士が同座標にある場合は重なりと判定しないこと", () => {
    const result = checkCircleOverlap({
      circleA: createCircle({ radius: 0 }),
      circleB: createCircle({ radius: 0 }),
    });

    expect(result.thresholdSquared).toBe(0);
    expect(result.isOverlapping).toBe(false);
  });

  it("半径0の点が相手の円の内部にある場合は重なりと判定すること", () => {
    const result = checkCircleOverlap({
      circleA: createCircle({ radius: 2 }),
      circleB: createCircle({ x: 1, radius: 0 }),
    });

    expect(result.isOverlapping).toBe(true);
  });

  it("半径0の点が相手の円周上にある場合は重なりと判定しないこと", () => {
    const result = checkCircleOverlap({
      circleA: createCircle({ radius: 2 }),
      circleB: createCircle({ x: 2, radius: 0 }),
    });

    expect(result.isOverlapping).toBe(false);
  });

  it("小さい円が大きい円に完全に内包される場合は重なりと判定すること", () => {
    const result = checkCircleOverlap({
      circleA: createCircle({ radius: 5 }),
      circleB: createCircle({ x: 0.5, radius: 0.5 }),
    });

    expect(result.isOverlapping).toBe(true);
  });

  it("x座標がNaNの場合は重なりと判定しないこと", () => {
    const result = checkCircleOverlap({
      circleA: createCircle(),
      circleB: createCircle({ x: Number.NaN }),
    });

    expect(result.distanceSquared).toBeNaN();
    expect(result.isOverlapping).toBe(false);
  });

  it("半径がNaNの場合は重なりと判定しないこと", () => {
    const result = checkCircleOverlap({
      circleA: createCircle({ radius: Number.NaN }),
      circleB: createCircle(),
    });

    expect(result.thresholdSquared).toBeNaN();
    expect(result.isOverlapping).toBe(false);
  });

  it("座標が無限大の場合は重なりと判定しないこと", () => {
    const result = checkCircleOverlap({
      circleA: createCircle(),
      circleB: createCircle({ x: Number.POSITIVE_INFINITY }),
    });

    expect(result.isOverlapping).toBe(false);
  });

  it("入力の円オブジェクトを変更しないこと", () => {
    const circleA = createCircle({ x: 1, y: 2, radius: 1.5 });
    const circleB = createCircle({ x: 3, y: 4, radius: 0.5 });
    checkCircleOverlap({ circleA, circleB });

    expect([circleA, circleB]).toEqual([
      { x: 1, y: 2, radius: 1.5 },
      { x: 3, y: 4, radius: 0.5 },
    ]);
  });

  it("負の半径は二乗により正のしきい値として扱われること", () => {
    // 負の半径は入力として想定外だが，二乗比較のため符号が失われる現行挙動を記録する
    const result = checkCircleOverlap({
      circleA: createCircle({ radius: -1 }),
      circleB: createCircle({ radius: -1 }),
    });

    expect(result.thresholdSquared).toBe(4);
    expect(result.isOverlapping).toBe(true);
  });
});
