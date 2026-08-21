/**
 * moveSync.test
 * MOVE ペイロード正規化ロジックの現行挙動を固定する characterization test
 * 量子化の丸め・非有限値・不正スケール時のフォールバックを検証する
 */
import { describe, expect, it } from "vitest";

import type { MovePayload } from "./player.type";
import {
  DEFAULT_MOVE_QUANTIZE_SCALE,
  isSameMovePayload,
  quantizeMovePayload,
} from "./moveSync";

// scale 既定値がリテラル型 100 として推論されるため，
// 100 以外のスケールを渡す現行挙動の検証には広い型の別名を用いる
const quantizeWithScale = quantizeMovePayload as (
  move: Readonly<MovePayload>,
  scale: number,
) => MovePayload;

describe("DEFAULT_MOVE_QUANTIZE_SCALE", () => {
  it("既定の量子化スケールが 100 であること", () => {
    expect(DEFAULT_MOVE_QUANTIZE_SCALE).toBe(100);
  });
});

describe("quantizeMovePayload", () => {
  it("既定スケールで小数第3位を四捨五入すること", () => {
    expect(quantizeMovePayload({ x: 1.234, y: 5.678 })).toEqual({
      x: 1.23,
      y: 5.68,
    });
  });

  it("整数座標をそのまま返すこと", () => {
    expect(quantizeMovePayload({ x: 3, y: 7 })).toEqual({ x: 3, y: 7 });
  });

  it("原点座標をそのまま返すこと", () => {
    expect(quantizeMovePayload({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("負の座標も四捨五入して返すこと", () => {
    expect(quantizeMovePayload({ x: -1.234, y: -5.678 })).toEqual({
      x: -1.23,
      y: -5.68,
    });
  });

  it("丸め境界の 1.235 を 1.24 に丸めること", () => {
    expect(quantizeMovePayload({ x: 1.235, y: -1.235 })).toEqual({
      x: 1.24,
      y: -1.24,
    });
  });

  it("浮動小数点誤差により 1.005 を 1 に丸めること", () => {
    expect(quantizeMovePayload({ x: 1.005, y: 1.005 })).toEqual({
      x: 1,
      y: 1,
    });
  });

  it("NaN 座標を 0 に置き換えること", () => {
    expect(quantizeMovePayload({ x: Number.NaN, y: Number.NaN })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("Infinity 座標を 0 に置き換えること", () => {
    expect(
      quantizeMovePayload({
        x: Number.POSITIVE_INFINITY,
        y: Number.NEGATIVE_INFINITY,
      }),
    ).toEqual({ x: 0, y: 0 });
  });

  it("軸ごとに独立して非有限値を 0 に置き換えること", () => {
    expect(quantizeMovePayload({ x: Number.NaN, y: 2.345 })).toEqual({
      x: 0,
      y: 2.35,
    });
  });

  it("スケールを指定した場合はその粒度で丸めること", () => {
    expect(quantizeWithScale({ x: 1.234, y: 5.678 }, 10)).toEqual({
      x: 1.2,
      y: 5.7,
    });
  });

  it("スケール 1 では整数に丸めること", () => {
    expect(quantizeWithScale({ x: 1.6, y: -1.6 }, 1)).toEqual({
      x: 2,
      y: -2,
    });
  });

  it("スケール 0 では量子化せず元の値を返すこと", () => {
    expect(quantizeWithScale({ x: 1.23456, y: -9.87654 }, 0)).toEqual({
      x: 1.23456,
      y: -9.87654,
    });
  });

  it("負のスケールでは量子化せず元の値を返すこと", () => {
    expect(quantizeWithScale({ x: 1.23456, y: -9.87654 }, -100)).toEqual({
      x: 1.23456,
      y: -9.87654,
    });
  });

  it("NaN スケールでは量子化せず元の値を返すこと", () => {
    expect(quantizeWithScale({ x: 1.23456, y: 0 }, Number.NaN)).toEqual({
      x: 1.23456,
      y: 0,
    });
  });

  it("Infinity スケールでは量子化せず元の値を返すこと", () => {
    expect(
      quantizeWithScale({ x: 1.23456, y: 0 }, Number.POSITIVE_INFINITY),
    ).toEqual({ x: 1.23456, y: 0 });
  });

  it("不正スケールでも非有限座標は 0 に置き換えること", () => {
    expect(quantizeWithScale({ x: Number.NaN, y: 1.5 }, 0)).toEqual({
      x: 0,
      y: 1.5,
    });
  });

  it("入力オブジェクトを変更せず新しいオブジェクトを返すこと", () => {
    const move = { x: 1.234, y: 5.678 };
    const quantized = quantizeMovePayload(move);

    expect(move).toEqual({ x: 1.234, y: 5.678 });
    expect(quantized).not.toBe(move);
  });

  it("ごく小さな負の座標が負のゼロになること", () => {
    const quantized = quantizeMovePayload({ x: -0.001, y: -0.001 });

    expect(Object.is(quantized.x, -0)).toBe(true);
    expect(Object.is(quantized.y, -0)).toBe(true);
  });
});

describe("isSameMovePayload", () => {
  it("x と y が一致する場合に true を返すこと", () => {
    expect(isSameMovePayload({ x: 1.5, y: 2.5 }, { x: 1.5, y: 2.5 })).toBe(
      true,
    );
  });

  it("x が異なる場合に false を返すこと", () => {
    expect(isSameMovePayload({ x: 1.5, y: 2.5 }, { x: 1.6, y: 2.5 })).toBe(
      false,
    );
  });

  it("y が異なる場合に false を返すこと", () => {
    expect(isSameMovePayload({ x: 1.5, y: 2.5 }, { x: 1.5, y: 2.6 })).toBe(
      false,
    );
  });

  it("原点同士を一致と判定すること", () => {
    expect(isSameMovePayload({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(true);
  });

  it("0 と負のゼロを一致と判定すること", () => {
    expect(isSameMovePayload({ x: 0, y: 0 }, { x: -0, y: -0 })).toBe(true);
  });

  it("NaN 同士を一致と判定すること", () => {
    expect(
      isSameMovePayload(
        { x: Number.NaN, y: Number.NaN },
        { x: Number.NaN, y: Number.NaN },
      ),
    ).toBe(true);
  });

  it("片方の軸だけが NaN の場合は一致と判定しないこと", () => {
    expect(
      isSameMovePayload({ x: Number.NaN, y: 2.5 }, { x: 1.5, y: 2.5 }),
    ).toBe(false);
  });

  it("x が NaN 同士でも y が異なれば一致と判定しないこと", () => {
    expect(
      isSameMovePayload(
        { x: Number.NaN, y: 2.5 },
        { x: Number.NaN, y: 2.6 },
      ),
    ).toBe(false);
  });

  it("Infinity 同士を一致と判定すること", () => {
    expect(
      isSameMovePayload(
        { x: Number.POSITIVE_INFINITY, y: Number.NEGATIVE_INFINITY },
        { x: Number.POSITIVE_INFINITY, y: Number.NEGATIVE_INFINITY },
      ),
    ).toBe(true);
  });

  it("符号の異なる Infinity を一致と判定しないこと", () => {
    expect(
      isSameMovePayload(
        { x: Number.POSITIVE_INFINITY, y: 0 },
        { x: Number.NEGATIVE_INFINITY, y: 0 },
      ),
    ).toBe(false);
  });
});
