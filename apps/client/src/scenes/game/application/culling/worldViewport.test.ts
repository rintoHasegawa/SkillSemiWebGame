/**
 * worldViewport.test
 * 可視矩形の解決と包含判定の現行挙動を固定する characterization test
 * 矩形拡張・点包含・円交差の境界値を検証する
 */
import { describe, expect, it } from "vitest";

import {
  expandWorldViewport,
  isCircleIntersectingViewport,
  isPointInViewport,
  resolveWorldViewport,
  type WorldViewport,
} from "./worldViewport";

/** テスト用の基準矩形を生成する */
const createViewport = (): WorldViewport => {
  return { left: 0, top: 0, right: 100, bottom: 200 };
};

describe("resolveWorldViewport", () => {
  it("中心座標とサイズから可視矩形を求めること", () => {
    expect(resolveWorldViewport(100, 200, 40, 60)).toEqual({
      left: 80,
      top: 170,
      right: 120,
      bottom: 230,
    });
  });

  it("サイズが0の場合は中心座標に潰れた矩形を返すこと", () => {
    expect(resolveWorldViewport(10, 20, 0, 0)).toEqual({
      left: 10,
      top: 20,
      right: 10,
      bottom: 20,
    });
  });

  it("負の中心座標でも同じ計算を行うこと", () => {
    expect(resolveWorldViewport(-100, -50, 20, 10)).toEqual({
      left: -110,
      top: -55,
      right: -90,
      bottom: -45,
    });
  });

  it("奇数サイズの場合は半分の小数値をそのまま扱うこと", () => {
    expect(resolveWorldViewport(0, 0, 3, 5)).toEqual({
      left: -1.5,
      top: -2.5,
      right: 1.5,
      bottom: 2.5,
    });
  });
});

describe("expandWorldViewport", () => {
  it("指定マージンで矩形を外側へ広げること", () => {
    expect(expandWorldViewport(createViewport(), 10)).toEqual({
      left: -10,
      top: -10,
      right: 110,
      bottom: 210,
    });
  });

  it("マージン0の場合は同じ値の矩形を返すこと", () => {
    expect(expandWorldViewport(createViewport(), 0)).toEqual(createViewport());
  });

  it("負のマージンの場合は矩形を内側へ狭めること", () => {
    expect(expandWorldViewport(createViewport(), -10)).toEqual({
      left: 10,
      top: 10,
      right: 90,
      bottom: 190,
    });
  });

  it("入力の矩形を破壊的に変更しないこと", () => {
    const viewport = createViewport();

    expandWorldViewport(viewport, 10);

    expect(viewport).toEqual(createViewport());
  });
});

describe("isPointInViewport", () => {
  it("矩形内部の点をtrueと判定すること", () => {
    expect(isPointInViewport(50, 100, createViewport())).toBe(true);
  });

  it("左上境界上の点をtrueと判定すること", () => {
    expect(isPointInViewport(0, 0, createViewport())).toBe(true);
  });

  it("右下境界上の点をtrueと判定すること", () => {
    expect(isPointInViewport(100, 200, createViewport())).toBe(true);
  });

  it("左境界より外側の点をfalseと判定すること", () => {
    expect(isPointInViewport(-0.1, 100, createViewport())).toBe(false);
  });

  it("右境界より外側の点をfalseと判定すること", () => {
    expect(isPointInViewport(100.1, 100, createViewport())).toBe(false);
  });

  it("上境界より外側の点をfalseと判定すること", () => {
    expect(isPointInViewport(50, -0.1, createViewport())).toBe(false);
  });

  it("下境界より外側の点をfalseと判定すること", () => {
    expect(isPointInViewport(50, 200.1, createViewport())).toBe(false);
  });
});

describe("isCircleIntersectingViewport", () => {
  it("矩形内部の円をtrueと判定すること", () => {
    expect(isCircleIntersectingViewport(50, 100, 10, createViewport())).toBe(
      true,
    );
  });

  it("半径0で矩形内部の点をtrueと判定すること", () => {
    expect(isCircleIntersectingViewport(50, 100, 0, createViewport())).toBe(
      true,
    );
  });

  it("左境界に接する円をtrueと判定すること", () => {
    expect(isCircleIntersectingViewport(-10, 100, 10, createViewport())).toBe(
      true,
    );
  });

  it("左境界に届かない円をfalseと判定すること", () => {
    expect(isCircleIntersectingViewport(-10.1, 100, 10, createViewport())).toBe(
      false,
    );
  });

  it("右境界に接する円をtrueと判定すること", () => {
    expect(isCircleIntersectingViewport(110, 100, 10, createViewport())).toBe(
      true,
    );
  });

  it("右境界を越えた円をfalseと判定すること", () => {
    expect(isCircleIntersectingViewport(110.1, 100, 10, createViewport())).toBe(
      false,
    );
  });

  it("上境界に接する円をtrueと判定すること", () => {
    expect(isCircleIntersectingViewport(50, -10, 10, createViewport())).toBe(
      true,
    );
  });

  it("下境界を越えた円をfalseと判定すること", () => {
    expect(isCircleIntersectingViewport(50, 210.1, 10, createViewport())).toBe(
      false,
    );
  });

  it("矩形の角の外側でも外接矩形が重なる場合はtrueと判定すること", () => {
    expect(isCircleIntersectingViewport(-10, -10, 10, createViewport())).toBe(
      true,
    );
  });
});
