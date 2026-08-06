/**
 * pingUseCase.test
 * PINGユースケースの現行応答内容を固定する characterization test
 * クライアント時刻の透過とサーバー時刻付与を検証する
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { pingUseCase } from "./pingUseCase";

const FIXED_NOW_MS = 1_700_000_000_000;

/** PONG送信内容を記録する出力ポートスタブを生成する */
const createOutputStub = () => {
  return {
    publishPongToSocket: vi.fn<
      (payload: { clientTime: number; serverTime: number }) => void
    >(),
  };
};

describe("pingUseCase", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("受信したクライアント時刻をそのまま返送すること", () => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW_MS);
    const output = createOutputStub();

    pingUseCase({ clientTime: 12_345, output });

    expect(output.publishPongToSocket).toHaveBeenCalledWith(
      expect.objectContaining({ clientTime: 12_345 }),
    );
  });

  it("送信時点のサーバー時刻を付与すること", () => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW_MS);
    const output = createOutputStub();

    pingUseCase({ clientTime: 12_345, output });

    expect(output.publishPongToSocket).toHaveBeenCalledWith(
      expect.objectContaining({ serverTime: FIXED_NOW_MS }),
    );
  });

  it("クライアント時刻が0でもそのまま返送すること", () => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW_MS);
    const output = createOutputStub();

    pingUseCase({ clientTime: 0, output });

    expect(output.publishPongToSocket).toHaveBeenCalledWith({
      clientTime: 0,
      serverTime: FIXED_NOW_MS,
    });
  });

  it("PONG送信を1回だけ実行すること", () => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_NOW_MS);
    const output = createOutputStub();

    pingUseCase({ clientTime: 1, output });

    expect(output.publishPongToSocket).toHaveBeenCalledTimes(1);
  });
});
