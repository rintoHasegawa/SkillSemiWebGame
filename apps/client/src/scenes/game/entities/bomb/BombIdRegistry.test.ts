/**
 * BombIdRegistry.test
 * 爆弾ID採番と対応管理の現行挙動を固定する characterization test
 * 採番書式・連番・削除経路ごとの解決可否を検証する
 */
import { describe, expect, it } from "vitest";

import { BombIdRegistry } from "./BombIdRegistry";

describe("BombIdRegistry", () => {
  it("最初の採番でrequestIdが1になること", () => {
    const registry = new BombIdRegistry();

    expect(registry.issuePendingOwnBombId().requestId).toBe("1");
  });

  it("tempBombIdがtempプレフィックス付きの書式になること", () => {
    const registry = new BombIdRegistry();

    expect(registry.issuePendingOwnBombId().tempBombId).toBe("temp:1");
  });

  it("採番のたびにrequestIdが連番で増えること", () => {
    const registry = new BombIdRegistry();

    registry.issuePendingOwnBombId();

    expect(registry.issuePendingOwnBombId().requestId).toBe("2");
  });

  it("採番したrequestIdからtempBombIdを解決できること", () => {
    const registry = new BombIdRegistry();

    const { requestId, tempBombId } = registry.issuePendingOwnBombId();

    expect(registry.resolveTempBombIdByRequestId(requestId)).toBe(tempBombId);
  });

  it("未採番のrequestIdではundefinedを返すこと", () => {
    const registry = new BombIdRegistry();

    expect(registry.resolveTempBombIdByRequestId("999")).toBeUndefined();
  });

  it("requestId起点の削除で解決できなくなること", () => {
    const registry = new BombIdRegistry();
    const { requestId } = registry.issuePendingOwnBombId();

    registry.removeByRequestId(requestId);

    expect(registry.resolveTempBombIdByRequestId(requestId)).toBeUndefined();
  });

  it("bombId起点の削除でも対応を解除すること", () => {
    const registry = new BombIdRegistry();
    const { requestId, tempBombId } = registry.issuePendingOwnBombId();

    registry.removeByBombId(tempBombId);

    expect(registry.resolveTempBombIdByRequestId(requestId)).toBeUndefined();
  });

  it("確定bombIdでの削除では仮ID対応を解除しないこと", () => {
    const registry = new BombIdRegistry();
    const { requestId, tempBombId } = registry.issuePendingOwnBombId();

    registry.removeByBombId("server-bomb-1");

    expect(registry.resolveTempBombIdByRequestId(requestId)).toBe(tempBombId);
  });

  it("クリアで全対応を解除すること", () => {
    const registry = new BombIdRegistry();
    const first = registry.issuePendingOwnBombId();
    const second = registry.issuePendingOwnBombId();

    registry.clear();

    expect([
      registry.resolveTempBombIdByRequestId(first.requestId),
      registry.resolveTempBombIdByRequestId(second.requestId),
    ]).toEqual([undefined, undefined]);
  });

  it("クリア後も採番の連番は継続すること", () => {
    const registry = new BombIdRegistry();
    registry.issuePendingOwnBombId();

    registry.clear();

    expect(registry.issuePendingOwnBombId().requestId).toBe("2");
  });
});
