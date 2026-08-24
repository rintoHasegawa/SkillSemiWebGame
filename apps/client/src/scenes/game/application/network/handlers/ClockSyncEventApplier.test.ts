/**
 * ClockSyncEventApplier.test
 * 時刻同期イベント反映の仕様を検証するテスト
 * サーバー経過msの検証分岐とコールバック呼び出し順を検証する
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GameStartPayload, PongPayload } from "@repo/shared";

import { ClockSyncEventApplier } from "./ClockSyncEventApplier";

/** 呼び出し記録付きの反映器を生成する */
const createApplier = (options: { withDebugLog?: boolean } = {}) => {
  const calls: string[] = [];
  const startedElapsedMsList: number[] = [];
  const clockHintElapsedMsList: number[] = [];
  const pongs: PongPayload[] = [];
  const debugMessages: string[] = [];

  const applier = new ClockSyncEventApplier({
    onGameStarted: (serverElapsedMs) => {
      calls.push("onGameStarted");
      startedElapsedMsList.push(serverElapsedMs);
    },
    onGameStartClockHint: (serverElapsedMs) => {
      calls.push("onGameStartClockHint");
      clockHintElapsedMsList.push(serverElapsedMs);
    },
    onPongReceived: (payload) => {
      calls.push("onPongReceived");
      pongs.push(payload);
    },
    onDebugLog: options.withDebugLog
      ? (message) => {
          calls.push("onDebugLog");
          debugMessages.push(message);
        }
      : undefined,
  });

  return {
    applier,
    calls,
    startedElapsedMsList,
    clockHintElapsedMsList,
    pongs,
    debugMessages,
  };
};

/** テスト用のゲーム開始ペイロードを生成する */
const createGameStartPayload = (
  overrides: Partial<GameStartPayload> = {},
): GameStartPayload => {
  return {
    serverElapsedMs: 5000,
    fieldSizePreset: "MEDIUM",
    gridCols: 20,
    gridRows: 15,
    ...overrides,
  };
};

/** テスト用のPONGペイロードを生成する */
const createPongPayload = (): PongPayload => {
  return {
    clientTime: 100,
    serverReceivedElapsedMs: 200,
    serverSentElapsedMs: 210,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ClockSyncEventApplier", () => {
  it("GAME_START受信でサーバー経過msを時計補正へ通知すること", () => {
    const { applier, clockHintElapsedMsList } = createApplier();

    applier.applyGameStart(createGameStartPayload());

    expect(clockHintElapsedMsList).toEqual([5000]);
  });

  it("GAME_START受信でサーバー経過msを開始通知へ渡すこと", () => {
    const { applier, startedElapsedMsList } = createApplier();

    applier.applyGameStart(createGameStartPayload());

    expect(startedElapsedMsList).toEqual([5000]);
  });

  it("GAME_START受信では時計補正を開始通知より先に行うこと", () => {
    const { applier, calls } = createApplier();

    applier.applyGameStart(createGameStartPayload());

    expect(calls).toEqual(["onGameStartClockHint", "onGameStarted"]);
  });

  it("サーバー経過msが0の場合もそのまま通知すること", () => {
    const { applier, startedElapsedMsList } = createApplier();

    applier.applyGameStart(createGameStartPayload({ serverElapsedMs: 0 }));

    expect(startedElapsedMsList).toEqual([0]);
  });

  it("カウントダウン中の負のサーバー経過msもそのまま通知すること", () => {
    const { applier, startedElapsedMsList } = createApplier();

    applier.applyGameStart(createGameStartPayload({ serverElapsedMs: -3000 }));

    expect(startedElapsedMsList).toEqual([-3000]);
  });

  it("カウントダウン中の負のサーバー経過msでも時計補正を行うこと", () => {
    const { applier, clockHintElapsedMsList } = createApplier();

    applier.applyGameStart(createGameStartPayload({ serverElapsedMs: -3000 }));

    expect(clockHintElapsedMsList).toEqual([-3000]);
  });

  it("サーバー経過msがnullの場合はコールバックを一切呼ばないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, calls } = createApplier();

    applier.applyGameStart(
      createGameStartPayload({ serverElapsedMs: null as unknown as number }),
    );

    expect(calls).toEqual([]);
  });

  it("サーバー経過msが欠落している場合は時計補正も行わないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, clockHintElapsedMsList } = createApplier();

    applier.applyGameStart(
      createGameStartPayload({
        serverElapsedMs: undefined as unknown as number,
      }),
    );

    expect(clockHintElapsedMsList).toEqual([]);
  });

  it("サーバー経過msが欠落している場合はエラーログを出力すること", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier } = createApplier();

    applier.applyGameStart(
      createGameStartPayload({
        serverElapsedMs: undefined as unknown as number,
      }),
    );

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[ClockSyncEventApplier]"),
    );
  });

  it("サーバー経過msがNaNの場合はコールバックを一切呼ばないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, calls } = createApplier();

    applier.applyGameStart(
      createGameStartPayload({ serverElapsedMs: Number.NaN }),
    );

    expect(calls).toEqual([]);
  });

  it("サーバー経過msがInfinityの場合はコールバックを一切呼ばないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, calls } = createApplier();

    applier.applyGameStart(
      createGameStartPayload({ serverElapsedMs: Number.POSITIVE_INFINITY }),
    );

    expect(calls).toEqual([]);
  });

  it("ペイロード自体が欠落している場合はコールバックを一切呼ばないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, calls } = createApplier();

    applier.applyGameStart(undefined as unknown as GameStartPayload);

    expect(calls).toEqual([]);
  });

  it("デバッグログ指定時はサーバー経過msを含むメッセージを出力すること", () => {
    const { applier, debugMessages } = createApplier({ withDebugLog: true });

    applier.applyGameStart(createGameStartPayload());

    expect(debugMessages).toEqual([
      "[GameNetworkSync] ゲーム経過時間同期完了: 5000",
    ]);
  });

  it("サーバー経過msがnullの場合はデバッグログを出力しないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, debugMessages } = createApplier({ withDebugLog: true });

    applier.applyGameStart(
      createGameStartPayload({ serverElapsedMs: null as unknown as number }),
    );

    expect(debugMessages).toEqual([]);
  });

  it("デバッグログ未指定でも例外を投げないこと", () => {
    const { applier } = createApplier();

    expect(() => applier.applyGameStart(createGameStartPayload())).not.toThrow();
  });

  it("PONG受信でペイロードをそのまま通知すること", () => {
    const { applier, pongs } = createApplier();
    const payload = createPongPayload();

    applier.applyPong(payload);

    expect(pongs[0]).toBe(payload);
  });

  it("PONG受信では他のコールバックを呼ばないこと", () => {
    const { applier, calls } = createApplier();

    applier.applyPong(createPongPayload());

    expect(calls).toEqual(["onPongReceived"]);
  });
});
