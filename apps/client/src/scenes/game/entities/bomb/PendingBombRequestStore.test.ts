/**
 * PendingBombRequestStore.test
 * 爆弾設置要求の対応表管理の現行挙動を固定する characterization test
 * 双方向削除と未登録キー指定時の扱いを検証する
 */
import { describe, expect, it } from "vitest";

import { PendingBombRequestStore } from "./PendingBombRequestStore";

describe("PendingBombRequestStore", () => {
  it("未登録のrequestIdではundefinedを返すこと", () => {
    const store = new PendingBombRequestStore();

    expect(store.getTempBombIdByRequestId("r1")).toBeUndefined();
  });

  it("登録したrequestIdからtempBombIdを解決すること", () => {
    const store = new PendingBombRequestStore();

    store.register("r1", "temp:1");

    expect(store.getTempBombIdByRequestId("r1")).toBe("temp:1");
  });

  it("同じrequestIdを再登録した場合は後勝ちで上書きすること", () => {
    const store = new PendingBombRequestStore();

    store.register("r1", "temp:1");
    store.register("r1", "temp:2");

    expect(store.getTempBombIdByRequestId("r1")).toBe("temp:2");
  });

  it("requestId起点の削除で対応を解除すること", () => {
    const store = new PendingBombRequestStore();
    store.register("r1", "temp:1");

    store.removeByRequestId("r1");

    expect(store.getTempBombIdByRequestId("r1")).toBeUndefined();
  });

  it("未登録requestIdの削除では他の対応を維持すること", () => {
    const store = new PendingBombRequestStore();
    store.register("r1", "temp:1");

    store.removeByRequestId("unknown");

    expect(store.getTempBombIdByRequestId("r1")).toBe("temp:1");
  });

  it("tempBombId起点の削除でrequestId側の対応も解除すること", () => {
    const store = new PendingBombRequestStore();
    store.register("r1", "temp:1");

    store.removeByTempBombId("temp:1");

    expect(store.getTempBombIdByRequestId("r1")).toBeUndefined();
  });

  it("未登録tempBombIdの削除では他の対応を維持すること", () => {
    const store = new PendingBombRequestStore();
    store.register("r1", "temp:1");

    store.removeByTempBombId("temp:999");

    expect(store.getTempBombIdByRequestId("r1")).toBe("temp:1");
  });

  it("複数登録のうち指定した対応のみ削除すること", () => {
    const store = new PendingBombRequestStore();
    store.register("r1", "temp:1");
    store.register("r2", "temp:2");

    store.removeByRequestId("r1");

    expect(store.getTempBombIdByRequestId("r2")).toBe("temp:2");
  });

  it("クリアですべての対応を削除すること", () => {
    const store = new PendingBombRequestStore();
    store.register("r1", "temp:1");
    store.register("r2", "temp:2");

    store.clear();

    expect([
      store.getTempBombIdByRequestId("r1"),
      store.getTempBombIdByRequestId("r2"),
    ]).toEqual([undefined, undefined]);
  });
});
