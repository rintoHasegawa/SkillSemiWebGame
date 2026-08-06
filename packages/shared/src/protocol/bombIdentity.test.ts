/**
 * bombIdentity.test
 * 爆弾同期ID生成の現行挙動を固定する characterization test
 * bombId 以外のフィールドが結果に影響しないことを検証する
 */
import { describe, expect, it } from "vitest";

import { createBombIdFromPayload, type BombNetworkPayload } from "./bombIdentity";

const createPayload = (
  overrides: Partial<BombNetworkPayload> = {},
): BombNetworkPayload => ({
  bombId: "bomb-1",
  ownerTeamId: 0,
  x: 1,
  y: 2,
  explodeAtElapsedMs: 1000,
  ...overrides,
});

describe("createBombIdFromPayload", () => {
  it("ペイロードの bombId をそのまま返すこと", () => {
    expect(createBombIdFromPayload(createPayload())).toBe("bomb-1");
  });

  it("座標やチームIDが異なっても bombId が同じなら同一IDを返すこと", () => {
    const first = createBombIdFromPayload(createPayload({ x: 0, y: 0 }));
    const second = createBombIdFromPayload(
      createPayload({ x: 9, y: 9, ownerTeamId: 3, explodeAtElapsedMs: 5000 }),
    );

    expect(first).toBe(second);
  });

  it("bombId が異なれば異なるIDを返すこと", () => {
    const first = createBombIdFromPayload(createPayload({ bombId: "bomb-1" }));
    const second = createBombIdFromPayload(createPayload({ bombId: "bomb-2" }));

    expect(first).not.toBe(second);
  });

  it("空文字の bombId をそのまま返すこと", () => {
    expect(createBombIdFromPayload(createPayload({ bombId: "" }))).toBe("");
  });
});
