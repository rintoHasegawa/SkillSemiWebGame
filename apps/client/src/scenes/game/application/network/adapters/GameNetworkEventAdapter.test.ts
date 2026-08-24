/**
 * GameNetworkEventAdapter.test
 * 受信ペイロード変換の仕様を検証するテスト
 * サーバー経過msの有限数検証と不正時のエラーログ・null 返却を確認する
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  GameStartPayload,
  HurricaneHitPayload,
  PlayerHitPayload,
} from "@repo/shared";

import {
  toBombPlacementAcknowledgedPayload,
  toGameStartElapsedMs,
  toRemoteBombPlacedPayload,
  toRemoteHurricaneHitPayload,
  toRemotePlayerHitPayload,
} from "./GameNetworkEventAdapter";

/** テスト用のゲーム開始ペイロードを生成する */
const createGameStartPayload = (
  overrides: Partial<GameStartPayload> = {},
): GameStartPayload => {
  return {
    roomId: "room-1",
    serverElapsedMs: 5000,
    fieldSizePreset: "MEDIUM",
    gridCols: 20,
    gridRows: 15,
    ...overrides,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toGameStartElapsedMs", () => {
  it("有限数のサーバー経過msをそのまま返すこと", () => {
    expect(toGameStartElapsedMs(createGameStartPayload())).toBe(5000);
  });

  it("サーバー経過msが0でもそのまま返すこと", () => {
    expect(
      toGameStartElapsedMs(createGameStartPayload({ serverElapsedMs: 0 })),
    ).toBe(0);
  });

  it("カウントダウン中の負のサーバー経過msもそのまま返すこと", () => {
    expect(
      toGameStartElapsedMs(createGameStartPayload({ serverElapsedMs: -3000 })),
    ).toBe(-3000);
  });

  it("サーバー経過msがNaNの場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartElapsedMs(
        createGameStartPayload({ serverElapsedMs: Number.NaN }),
      ),
    ).toBeNull();
  });

  it("サーバー経過msがInfinityの場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartElapsedMs(
        createGameStartPayload({ serverElapsedMs: Number.POSITIVE_INFINITY }),
      ),
    ).toBeNull();
  });

  it("サーバー経過msが-Infinityの場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartElapsedMs(
        createGameStartPayload({ serverElapsedMs: Number.NEGATIVE_INFINITY }),
      ),
    ).toBeNull();
  });

  it("サーバー経過msがnullの場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartElapsedMs(
        createGameStartPayload({
          serverElapsedMs: null as unknown as number,
        }),
      ),
    ).toBeNull();
  });

  it("サーバー経過msが欠落している場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartElapsedMs(
        createGameStartPayload({
          serverElapsedMs: undefined as unknown as number,
        }),
      ),
    ).toBeNull();
  });

  it("サーバー経過msが数値以外の場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartElapsedMs(
        createGameStartPayload({
          serverElapsedMs: "5000" as unknown as number,
        }),
      ),
    ).toBeNull();
  });

  it("ペイロード自体が欠落している場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartElapsedMs(undefined as unknown as GameStartPayload),
    ).toBeNull();
  });

  it("不正なサーバー経過msの場合はエラーログを出力すること", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    toGameStartElapsedMs(
      createGameStartPayload({ serverElapsedMs: Number.NaN }),
    );

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[GameNetworkEventAdapter]"),
      Number.NaN,
    );
  });

  it("正常なサーバー経過msの場合はエラーログを出力しないこと", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    toGameStartElapsedMs(createGameStartPayload());

    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("toRemoteBombPlacedPayload", () => {
  it("受信ペイロードを同一参照のまま返すこと", () => {
    const payload: BombPlacedPayload = {
      bombId: "bomb-1",
      ownerTeamId: 0,
      x: 1,
      y: 2,
      explodeAtElapsedMs: 100,
    };

    expect(toRemoteBombPlacedPayload(payload)).toBe(payload);
  });
});

describe("toBombPlacementAcknowledgedPayload", () => {
  it("受信ペイロードを同一参照のまま返すこと", () => {
    const payload: BombPlacedAckPayload = {
      bombId: "bomb-1",
      requestId: "req-1",
    };

    expect(toBombPlacementAcknowledgedPayload(payload)).toBe(payload);
  });
});

describe("toRemotePlayerHitPayload", () => {
  it("受信ペイロードを同一参照のまま返すこと", () => {
    const payload: PlayerHitPayload = { playerId: "p1" };

    expect(toRemotePlayerHitPayload(payload)).toBe(payload);
  });
});

describe("toRemoteHurricaneHitPayload", () => {
  it("受信ペイロードを同一参照のまま返すこと", () => {
    const payload: HurricaneHitPayload = { playerId: "p1" };

    expect(toRemoteHurricaneHitPayload(payload)).toBe(payload);
  });
});
