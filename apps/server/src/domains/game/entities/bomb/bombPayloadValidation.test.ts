/**
 * bombPayloadValidation.test
 * 爆弾設置ペイロード型ガードの現行挙動を固定する characterization test
 * 各フィールドの必須条件と非オブジェクト・非有限数の失敗分岐を検証する
 */
import { describe, expect, it } from "vitest";

import { isPlaceBombPayload } from "./bombPayloadValidation";

/** テスト用の正常な爆弾設置ペイロードを生成する */
const createPayload = (overrides: Record<string, unknown> = {}): unknown => {
  return {
    requestId: "req-1",
    x: 120,
    y: 240,
    explodeAtElapsedMs: 1000,
    ...overrides,
  };
};

describe("isPlaceBombPayload", () => {
  it("全フィールドが揃っている場合はtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload())).toBe(true);
  });

  it("未知のフィールドが含まれていてもtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ extra: "value" }))).toBe(true);
  });

  it("nullの場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(null)).toBe(false);
  });

  it("undefinedの場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(undefined)).toBe(false);
  });

  it("文字列の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload("payload")).toBe(false);
  });

  it("数値の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(1)).toBe(false);
  });

  it("空オブジェクトの場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload({})).toBe(false);
  });

  it("配列の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload([])).toBe(false);
  });

  it("requestIdが欠落している場合はfalseを返すこと", () => {
    expect(
      isPlaceBombPayload({ x: 1, y: 2, explodeAtElapsedMs: 3 }),
    ).toBe(false);
  });

  it("requestIdが空文字の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ requestId: "" }))).toBe(false);
  });

  it("requestIdが空白のみの場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ requestId: "   " }))).toBe(false);
  });

  it("requestIdが前後に空白を含む場合はtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ requestId: " a " }))).toBe(true);
  });

  it("requestIdが数値の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ requestId: 1 }))).toBe(false);
  });

  it("xが文字列の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ x: "120" }))).toBe(false);
  });

  it("xがNaNの場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ x: Number.NaN }))).toBe(false);
  });

  it("xがInfinityの場合はfalseを返すこと", () => {
    expect(
      isPlaceBombPayload(createPayload({ x: Number.POSITIVE_INFINITY })),
    ).toBe(false);
  });

  it("xが0の場合はtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ x: 0 }))).toBe(true);
  });

  it("xが負値の場合もtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ x: -9999 }))).toBe(true);
  });

  it("yが欠落している場合はfalseを返すこと", () => {
    expect(
      isPlaceBombPayload({ requestId: "req-1", x: 1, explodeAtElapsedMs: 3 }),
    ).toBe(false);
  });

  it("yがNaNの場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ y: Number.NaN }))).toBe(false);
  });

  it("yが0の場合はtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ y: 0 }))).toBe(true);
  });

  it("explodeAtElapsedMsが欠落している場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload({ requestId: "req-1", x: 1, y: 2 })).toBe(false);
  });

  it("explodeAtElapsedMsがnullの場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ explodeAtElapsedMs: null }))).toBe(
      false,
    );
  });

  it("explodeAtElapsedMsが0の場合はtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ explodeAtElapsedMs: 0 }))).toBe(
      true,
    );
  });

  it("explodeAtElapsedMsが負値の場合もtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ explodeAtElapsedMs: -1 }))).toBe(
      true,
    );
  });

  it("座標が範囲外の巨大値でもtrueを返すこと", () => {
    expect(
      isPlaceBombPayload(createPayload({ x: 1e12, y: -1e12 })),
    ).toBe(true);
  });
});
