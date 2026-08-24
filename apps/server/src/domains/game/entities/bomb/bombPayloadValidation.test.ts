/**
 * bombPayloadValidation.test
 * 爆弾設置ペイロード型ガードの仕様適合を検証するテスト
 * 各フィールドの必須条件と，座標・爆発予定時刻の範囲境界を検証する
 * 基準値は SPEC_03（最大フィールド 54×54，制限時間180秒，信管1000ms）とする
 */
import { describe, expect, it } from "vitest";

import { isPlaceBombPayload } from "./bombPayloadValidation";

// 仕様上の最大フィールド（XLARGE）の実グリッドサイズ（SPEC_03）
const MAX_GRID_COLS = 54;
const MAX_GRID_ROWS = 54;

// 仕様上の爆発予定時刻の上限（制限時間180秒 + 信管1000ms．SPEC_03）
const MAX_EXPLODE_AT_ELAPSED_MS = 181000;

// プロトコル内部IDの防御的な最大長（クライアント採番は十進連番で数文字）
const MAX_REQUEST_ID_LENGTH = 64;

/** テスト用の正常な爆弾設置ペイロードを生成する */
const createPayload = (overrides: Record<string, unknown> = {}): unknown => {
  return {
    requestId: "req-1",
    x: 12,
    y: 24,
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

  it("必須フィールドを持つ配列の場合もfalseを返すこと", () => {
    const arrayPayload = Object.assign([], {
      requestId: "req-1",
      x: 12,
      y: 24,
      explodeAtElapsedMs: 1000,
    });

    expect(isPlaceBombPayload(arrayPayload)).toBe(false);
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

  it("requestIdが上限64文字の場合はtrueを返すこと", () => {
    expect(
      isPlaceBombPayload(
        createPayload({ requestId: "a".repeat(MAX_REQUEST_ID_LENGTH) }),
      ),
    ).toBe(true);
  });

  it("requestIdが上限超過の65文字の場合はfalseを返すこと", () => {
    expect(
      isPlaceBombPayload(
        createPayload({ requestId: "a".repeat(MAX_REQUEST_ID_LENGTH + 1) }),
      ),
    ).toBe(false);
  });

  it("requestIdが1MB相当の巨大文字列の場合はfalseを返すこと", () => {
    expect(
      isPlaceBombPayload(createPayload({ requestId: "a".repeat(1_000_000) })),
    ).toBe(false);
  });

  it("xが文字列の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ x: "12" }))).toBe(false);
  });

  it("xがNaNの場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ x: Number.NaN }))).toBe(false);
  });

  it("xがInfinityの場合はfalseを返すこと", () => {
    expect(
      isPlaceBombPayload(createPayload({ x: Number.POSITIVE_INFINITY })),
    ).toBe(false);
  });

  it("xが下限0の場合はtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ x: 0 }))).toBe(true);
  });

  it("xが上限54の場合はtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ x: MAX_GRID_COLS }))).toBe(true);
  });

  it("xが下限未満の-1の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ x: -1 }))).toBe(false);
  });

  it("xが上限超過の55の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ x: MAX_GRID_COLS + 1 }))).toBe(
      false,
    );
  });

  it("xが負値の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ x: -9999 }))).toBe(false);
  });

  it("yが欠落している場合はfalseを返すこと", () => {
    expect(
      isPlaceBombPayload({ requestId: "req-1", x: 1, explodeAtElapsedMs: 3 }),
    ).toBe(false);
  });

  it("yがNaNの場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ y: Number.NaN }))).toBe(false);
  });

  it("yが下限0の場合はtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ y: 0 }))).toBe(true);
  });

  it("yが上限54の場合はtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ y: MAX_GRID_ROWS }))).toBe(true);
  });

  it("yが下限未満の-1の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ y: -1 }))).toBe(false);
  });

  it("yが上限超過の55の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ y: MAX_GRID_ROWS + 1 }))).toBe(
      false,
    );
  });

  it("座標が小数でも範囲内であればtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ x: 12.5, y: 24.5 }))).toBe(true);
  });

  it("explodeAtElapsedMsが欠落している場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload({ requestId: "req-1", x: 1, y: 2 })).toBe(false);
  });

  it("explodeAtElapsedMsがnullの場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ explodeAtElapsedMs: null }))).toBe(
      false,
    );
  });

  it("explodeAtElapsedMsが下限0の場合はtrueを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ explodeAtElapsedMs: 0 }))).toBe(
      true,
    );
  });

  it("explodeAtElapsedMsが上限181000の場合はtrueを返すこと", () => {
    expect(
      isPlaceBombPayload(
        createPayload({ explodeAtElapsedMs: MAX_EXPLODE_AT_ELAPSED_MS }),
      ),
    ).toBe(true);
  });

  it("explodeAtElapsedMsが下限未満の-1の場合はfalseを返すこと", () => {
    expect(isPlaceBombPayload(createPayload({ explodeAtElapsedMs: -1 }))).toBe(
      false,
    );
  });

  it("explodeAtElapsedMsが上限超過の181001の場合はfalseを返すこと", () => {
    expect(
      isPlaceBombPayload(
        createPayload({ explodeAtElapsedMs: MAX_EXPLODE_AT_ELAPSED_MS + 1 }),
      ),
    ).toBe(false);
  });

  it("explodeAtElapsedMsがInfinityの場合はfalseを返すこと", () => {
    expect(
      isPlaceBombPayload(
        createPayload({ explodeAtElapsedMs: Number.POSITIVE_INFINITY }),
      ),
    ).toBe(false);
  });

  it("座標が範囲外の巨大値の場合はfalseを返すこと", () => {
    expect(
      isPlaceBombPayload(createPayload({ x: 1e12, y: -1e12 })),
    ).toBe(false);
  });
});
