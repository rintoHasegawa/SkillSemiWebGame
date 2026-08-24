/**
 * TimeProvider.test
 * 既定の時刻取得実装が単調時計を返す仕様を検証する
 * 端末の壁時計に依存しないことを回帰防止する
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { SYSTEM_TIME_PROVIDER } from "./TimeProvider";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SYSTEM_TIME_PROVIDER", () => {
  it("単調時計の現在値を返すこと", () => {
    vi.spyOn(performance, "now").mockReturnValue(4242);

    expect(SYSTEM_TIME_PROVIDER.now()).toBe(4242);
  });

  it("壁時計を参照しないこと", () => {
    vi.spyOn(performance, "now").mockReturnValue(4242);
    const dateNowSpy = vi.spyOn(Date, "now");

    SYSTEM_TIME_PROVIDER.now();

    expect(dateNowSpy).not.toHaveBeenCalled();
  });

  it("呼び出しごとに時刻が巻き戻らないこと", () => {
    const firstMs = SYSTEM_TIME_PROVIDER.now();
    const secondMs = SYSTEM_TIME_PROVIDER.now();

    expect(secondMs).toBeGreaterThanOrEqual(firstMs);
  });
});
