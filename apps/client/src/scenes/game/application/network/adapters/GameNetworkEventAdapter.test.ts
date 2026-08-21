/**
 * GameNetworkEventAdapter.test
 * 受信ペイロード変換の仕様を検証するテスト
 * 開始時刻の有限数検証と不正時のエラーログ・null 返却を確認する
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
  toGameStartedAt,
  toRemoteBombPlacedPayload,
  toRemoteHurricaneHitPayload,
  toRemotePlayerHitPayload,
} from "./GameNetworkEventAdapter";

/** テスト用のゲーム開始ペイロードを生成する */
const createGameStartPayload = (
  overrides: Partial<GameStartPayload> = {},
): GameStartPayload => {
  return {
    startTime: 5000,
    serverNow: 4000,
    fieldSizePreset: "MEDIUM",
    gridCols: 20,
    gridRows: 15,
    ...overrides,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toGameStartedAt", () => {
  it("有限数の開始時刻をそのまま返すこと", () => {
    expect(toGameStartedAt(createGameStartPayload())).toBe(5000);
  });

  it("開始時刻が0でもそのまま返すこと", () => {
    expect(toGameStartedAt(createGameStartPayload({ startTime: 0 }))).toBe(0);
  });

  it("負の開始時刻もそのまま返すこと", () => {
    expect(toGameStartedAt(createGameStartPayload({ startTime: -1 }))).toBe(-1);
  });

  it("開始時刻がNaNの場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartedAt(createGameStartPayload({ startTime: Number.NaN })),
    ).toBeNull();
  });

  it("開始時刻がInfinityの場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartedAt(
        createGameStartPayload({ startTime: Number.POSITIVE_INFINITY }),
      ),
    ).toBeNull();
  });

  it("開始時刻が-Infinityの場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartedAt(
        createGameStartPayload({ startTime: Number.NEGATIVE_INFINITY }),
      ),
    ).toBeNull();
  });

  it("開始時刻がnullの場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartedAt(
        createGameStartPayload({ startTime: null as unknown as number }),
      ),
    ).toBeNull();
  });

  it("開始時刻が欠落している場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartedAt(
        createGameStartPayload({ startTime: undefined as unknown as number }),
      ),
    ).toBeNull();
  });

  it("開始時刻が数値以外の場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartedAt(
        createGameStartPayload({ startTime: "5000" as unknown as number }),
      ),
    ).toBeNull();
  });

  it("ペイロード自体が欠落している場合はnullを返すこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(
      toGameStartedAt(undefined as unknown as GameStartPayload),
    ).toBeNull();
  });

  it("不正な開始時刻の場合はエラーログを出力すること", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    toGameStartedAt(createGameStartPayload({ startTime: Number.NaN }));

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[GameNetworkEventAdapter]"),
      Number.NaN,
    );
  });

  it("正常な開始時刻の場合はエラーログを出力しないこと", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    toGameStartedAt(createGameStartPayload());

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
