/**
 * frameDelta.test
 * フレーム時間差分の正規化の現行挙動を固定する characterization test
 * 上限クランプ・負値クランプと秒換算の境界を検証する
 */
import type { Ticker } from "pixi.js";
import { describe, expect, it } from "vitest";

import { resolveFrameDelta } from "./frameDelta";

/** 指定 deltaMS を返すTickerスタブを生成する */
const createTickerStub = (deltaMs: number): Ticker => {
  return { deltaMS: deltaMs } as unknown as Ticker;
};

describe("resolveFrameDelta", () => {
  it("上限内の差分をそのまま返すこと", () => {
    expect(resolveFrameDelta(createTickerStub(16), 50)).toEqual({
      deltaMs: 16,
      deltaSeconds: 0.016,
    });
  });

  it("上限ちょうどの差分をそのまま返すこと", () => {
    expect(resolveFrameDelta(createTickerStub(50), 50).deltaMs).toBe(50);
  });

  it("上限を超える差分を上限へクランプすること", () => {
    expect(resolveFrameDelta(createTickerStub(120), 50).deltaMs).toBe(50);
  });

  it("負の差分を0へクランプすること", () => {
    expect(resolveFrameDelta(createTickerStub(-5), 50)).toEqual({
      deltaMs: 0,
      deltaSeconds: 0,
    });
  });

  it("差分0をそのまま返すこと", () => {
    expect(resolveFrameDelta(createTickerStub(0), 50).deltaMs).toBe(0);
  });

  it("ミリ秒差分を秒へ換算すること", () => {
    expect(resolveFrameDelta(createTickerStub(1000), 5000).deltaSeconds).toBe(1);
  });

  it("上限0の場合は常に0を返すこと", () => {
    expect(resolveFrameDelta(createTickerStub(33), 0).deltaMs).toBe(0);
  });
});
