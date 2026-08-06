/**
 * bombPlacement.test
 * 爆弾設置キー生成と確定ペイロード組み立ての現行挙動を固定する characterization test
 * 連結書式・フィールド写像・入力値の透過を検証する
 */
import type { PlaceBombPayload } from "@repo/shared";
import { describe, expect, it } from "vitest";

import {
  createBombDedupeKey,
  createBombPlacedAckPayload,
  createBombPlacedPayload,
} from "./bombPlacement";

/** テスト用の爆弾設置ペイロードを生成する */
const createPlaceBombPayload = (
  overrides: Partial<PlaceBombPayload> = {},
): PlaceBombPayload => {
  return {
    requestId: "req-1",
    x: 120,
    y: 240,
    explodeAtElapsedMs: 1000,
    ...overrides,
  };
};

describe("createBombDedupeKey", () => {
  it("設置者IDと要求IDをコロンで連結すること", () => {
    expect(createBombDedupeKey("player-1", "req-1")).toBe("player-1:req-1");
  });

  it("設置者が異なれば別のキーになること", () => {
    expect(createBombDedupeKey("player-1", "req-1")).not.toBe(
      createBombDedupeKey("player-2", "req-1"),
    );
  });

  it("要求IDが異なれば別のキーになること", () => {
    expect(createBombDedupeKey("player-1", "req-1")).not.toBe(
      createBombDedupeKey("player-1", "req-2"),
    );
  });

  it("設置者IDが空文字でも連結すること", () => {
    expect(createBombDedupeKey("", "req-1")).toBe(":req-1");
  });

  it("要求IDが空文字でも連結すること", () => {
    expect(createBombDedupeKey("player-1", "")).toBe("player-1:");
  });

  it("引数にコロンが含まれてもエスケープせず単純連結すること", () => {
    expect(createBombDedupeKey("a:b", "c")).toBe("a:b:c");
  });
});

describe("createBombPlacedPayload", () => {
  it("爆弾IDとチームIDと座標を含むペイロードを生成すること", () => {
    expect(
      createBombPlacedPayload({
        payload: createPlaceBombPayload(),
        bombId: "bomb-1",
        ownerTeamId: 2,
      }),
    ).toEqual({
      bombId: "bomb-1",
      ownerTeamId: 2,
      x: 120,
      y: 240,
      explodeAtElapsedMs: 1000,
    });
  });

  it("要求IDを配信ペイロードに含めないこと", () => {
    const result = createBombPlacedPayload({
      payload: createPlaceBombPayload(),
      bombId: "bomb-1",
      ownerTeamId: 2,
    });

    expect(result).not.toHaveProperty("requestId");
  });

  it("座標0をそのまま透過すること", () => {
    const result = createBombPlacedPayload({
      payload: createPlaceBombPayload({ x: 0, y: 0 }),
      bombId: "bomb-1",
      ownerTeamId: 1,
    });

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it("負の座標をクランプせず透過すること", () => {
    const result = createBombPlacedPayload({
      payload: createPlaceBombPayload({ x: -50, y: -80 }),
      bombId: "bomb-1",
      ownerTeamId: 1,
    });

    expect(result.x).toBe(-50);
    expect(result.y).toBe(-80);
  });

  it("爆発時刻0をそのまま透過すること", () => {
    const result = createBombPlacedPayload({
      payload: createPlaceBombPayload({ explodeAtElapsedMs: 0 }),
      bombId: "bomb-1",
      ownerTeamId: 1,
    });

    expect(result.explodeAtElapsedMs).toBe(0);
  });

  it("チームID0をそのまま透過すること", () => {
    const result = createBombPlacedPayload({
      payload: createPlaceBombPayload(),
      bombId: "bomb-1",
      ownerTeamId: 0,
    });

    expect(result.ownerTeamId).toBe(0);
  });

  it("爆弾IDが空文字でもそのまま透過すること", () => {
    const result = createBombPlacedPayload({
      payload: createPlaceBombPayload(),
      bombId: "",
      ownerTeamId: 1,
    });

    expect(result.bombId).toBe("");
  });

  it("入力ペイロードを変更しないこと", () => {
    const payload = createPlaceBombPayload();

    createBombPlacedPayload({ payload, bombId: "bomb-1", ownerTeamId: 2 });

    expect(payload).toEqual(createPlaceBombPayload());
  });

  it("入力ペイロードとは別のオブジェクトを返すこと", () => {
    const payload = createPlaceBombPayload();

    expect(
      createBombPlacedPayload({ payload, bombId: "bomb-1", ownerTeamId: 2 }),
    ).not.toBe(payload);
  });
});

describe("createBombPlacedAckPayload", () => {
  it("要求IDと爆弾IDを持つACKペイロードを生成すること", () => {
    expect(
      createBombPlacedAckPayload({ requestId: "req-1", bombId: "bomb-1" }),
    ).toEqual({ requestId: "req-1", bombId: "bomb-1" });
  });

  it("要求IDが空文字でもそのまま透過すること", () => {
    expect(
      createBombPlacedAckPayload({ requestId: "", bombId: "bomb-1" }),
    ).toEqual({ requestId: "", bombId: "bomb-1" });
  });

  it("爆弾IDが空文字でもそのまま透過すること", () => {
    expect(
      createBombPlacedAckPayload({ requestId: "req-1", bombId: "" }),
    ).toEqual({ requestId: "req-1", bombId: "" });
  });

  it("呼び出しごとに別のオブジェクトを返すこと", () => {
    const params = { requestId: "req-1", bombId: "bomb-1" };

    expect(createBombPlacedAckPayload(params)).not.toBe(
      createBombPlacedAckPayload(params),
    );
  });
});
