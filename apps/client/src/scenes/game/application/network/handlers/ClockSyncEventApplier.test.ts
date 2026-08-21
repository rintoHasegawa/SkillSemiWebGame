/**
 * ClockSyncEventApplier.test
 * 時刻同期イベント反映の現行挙動を固定する characterization test
 * 開始時刻欠落時の分岐とコールバック呼び出し順を検証する
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GameStartPayload } from "@repo/shared";

import { ClockSyncEventApplier } from "./ClockSyncEventApplier";

/** 呼び出し記録付きの反映器を生成する */
const createApplier = (options: { withDebugLog?: boolean } = {}) => {
  const calls: string[] = [];
  const startTimes: number[] = [];
  const serverNows: number[] = [];
  const pongs: { clientTime: number; serverTime: number }[] = [];
  const debugMessages: string[] = [];

  const applier = new ClockSyncEventApplier({
    onGameStarted: (startTime) => {
      calls.push("onGameStarted");
      startTimes.push(startTime);
    },
    onGameStartClockHint: (serverNowMs) => {
      calls.push("onGameStartClockHint");
      serverNows.push(serverNowMs);
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

  return { applier, calls, startTimes, serverNows, pongs, debugMessages };
};

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

describe("ClockSyncEventApplier", () => {
  it("GAME_START受信でサーバー時刻ヒントを通知すること", () => {
    const { applier, serverNows } = createApplier();

    applier.applyGameStart(createGameStartPayload());

    expect(serverNows).toEqual([4000]);
  });

  it("GAME_START受信で開始時刻を通知すること", () => {
    const { applier, startTimes } = createApplier();

    applier.applyGameStart(createGameStartPayload());

    expect(startTimes).toEqual([5000]);
  });

  it("GAME_START受信では時刻ヒントを開始時刻より先に通知すること", () => {
    const { applier, calls } = createApplier();

    applier.applyGameStart(createGameStartPayload());

    expect(calls).toEqual(["onGameStartClockHint", "onGameStarted"]);
  });

  it("開始時刻が0の場合もそのまま通知すること", () => {
    const { applier, startTimes } = createApplier();

    applier.applyGameStart(createGameStartPayload({ startTime: 0 }));

    expect(startTimes).toEqual([0]);
  });

  it("開始時刻がnullの場合はコールバックを一切呼ばないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, calls } = createApplier();

    applier.applyGameStart(
      createGameStartPayload({ startTime: null as unknown as number }),
    );

    expect(calls).toEqual([]);
  });

  it("開始時刻が欠落している場合はサーバー時刻ヒントも通知しないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, serverNows } = createApplier();

    applier.applyGameStart(
      createGameStartPayload({ startTime: undefined as unknown as number }),
    );

    expect(serverNows).toEqual([]);
  });

  it("開始時刻が欠落している場合はエラーログを出力すること", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier } = createApplier();

    applier.applyGameStart(
      createGameStartPayload({ startTime: undefined as unknown as number }),
    );

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[ClockSyncEventApplier]"),
    );
  });

  it("開始時刻がNaNの場合はコールバックを一切呼ばないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, calls } = createApplier();

    applier.applyGameStart(createGameStartPayload({ startTime: Number.NaN }));

    expect(calls).toEqual([]);
  });

  it("開始時刻がInfinityの場合はコールバックを一切呼ばないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, calls } = createApplier();

    applier.applyGameStart(
      createGameStartPayload({ startTime: Number.POSITIVE_INFINITY }),
    );

    expect(calls).toEqual([]);
  });

  it("サーバー時刻が非有限の場合は時計補正を行わないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, serverNows } = createApplier();

    applier.applyGameStart(createGameStartPayload({ serverNow: Number.NaN }));

    expect(serverNows).toEqual([]);
  });

  it("サーバー時刻が非有限でも開始時刻が正しければ開始通知は行うこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, startTimes } = createApplier();

    applier.applyGameStart(createGameStartPayload({ serverNow: Number.NaN }));

    expect(startTimes).toEqual([5000]);
  });

  it("サーバー時刻が欠落している場合は時計補正を行わないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, serverNows } = createApplier();

    applier.applyGameStart(
      createGameStartPayload({ serverNow: undefined as unknown as number }),
    );

    expect(serverNows).toEqual([]);
  });

  it("サーバー時刻が非有限の場合はエラーログを出力すること", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier } = createApplier();

    applier.applyGameStart(createGameStartPayload({ serverNow: Number.NaN }));

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("デバッグログ指定時は開始時刻を含むメッセージを出力すること", () => {
    const { applier, debugMessages } = createApplier({ withDebugLog: true });

    applier.applyGameStart(createGameStartPayload());

    expect(debugMessages).toEqual([
      "[GameNetworkSync] ゲーム開始時刻同期完了: 5000",
    ]);
  });

  it("開始時刻がnullの場合はデバッグログを出力しないこと", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { applier, debugMessages } = createApplier({ withDebugLog: true });

    applier.applyGameStart(
      createGameStartPayload({ startTime: null as unknown as number }),
    );

    expect(debugMessages).toEqual([]);
  });

  it("デバッグログ未指定でも例外を投げないこと", () => {
    const { applier } = createApplier();

    expect(() => applier.applyGameStart(createGameStartPayload())).not.toThrow();
  });

  it("PONG受信でペイロードをそのまま通知すること", () => {
    const { applier, pongs } = createApplier();
    const payload = { clientTime: 100, serverTime: 200 };

    applier.applyPong(payload);

    expect(pongs[0]).toBe(payload);
  });

  it("PONG受信では他のコールバックを呼ばないこと", () => {
    const { applier, calls } = createApplier();

    applier.applyPong({ clientTime: 100, serverTime: 200 });

    expect(calls).toEqual(["onPongReceived"]);
  });
});
