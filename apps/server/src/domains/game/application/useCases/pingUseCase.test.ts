/**
 * pingUseCase.test
 * PINGユースケースの応答内容を検証するユニットテスト
 * クライアント時刻の透過と，受信時・送信時の2点のゲーム経過ms付与を検証する
 * 壁時計は一切載らず，セッション未開始時はPONGを返さないことを確認する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  gameUseCaseLogEvents,
  logResults,
  logScopes,
} from "@server/logging/index";
import { pingUseCase } from "./pingUseCase";

/** 経過msを順番に返す GameElapsedTimePort スタブを生成する */
const createGameClockStub = (elapsedValues: (number | undefined)[]) => {
  let callIndex = 0;

  return {
    getRoomSignedElapsedMs: vi.fn<() => number | undefined>(() => {
      // 呼び出しごとに時計が進む状況を再現し，最後の値を保持する
      const value = elapsedValues[Math.min(callIndex, elapsedValues.length - 1)];
      callIndex += 1;
      return value;
    }),
  };
};

/** PONG送信内容を記録する出力ポートスタブを生成する */
const createOutputStub = () => {
  return {
    publishPongToSocket: vi.fn<
      (payload: {
        clientTime: number;
        serverReceivedElapsedMs: number;
        serverSentElapsedMs: number;
      }) => void
    >(),
  };
};

let logSpy: ReturnType<typeof vi.spyOn>;

describe("pingUseCase", () => {
  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("受信したクライアント時刻をそのまま返送すること", () => {
    const output = createOutputStub();

    pingUseCase({
      socketId: "socket-1",
      clientTime: 12_345,
      gameClock: createGameClockStub([1_000]),
      output,
    });

    expect(output.publishPongToSocket).toHaveBeenCalledWith(
      expect.objectContaining({ clientTime: 12_345 }),
    );
  });

  it("クライアント時刻が0でもそのまま返送すること", () => {
    const output = createOutputStub();

    pingUseCase({
      socketId: "socket-1",
      clientTime: 0,
      gameClock: createGameClockStub([1_000]),
      output,
    });

    expect(output.publishPongToSocket).toHaveBeenCalledWith(
      expect.objectContaining({ clientTime: 0 }),
    );
  });

  it("受信時点のゲーム経過msを付与すること", () => {
    const output = createOutputStub();

    pingUseCase({
      socketId: "socket-1",
      clientTime: 1,
      gameClock: createGameClockStub([1_000, 1_007]),
      output,
    });

    expect(output.publishPongToSocket).toHaveBeenCalledWith(
      expect.objectContaining({ serverReceivedElapsedMs: 1_000 }),
    );
  });

  it("送信時点のゲーム経過msを受信時とは別に付与すること", () => {
    const output = createOutputStub();

    pingUseCase({
      socketId: "socket-1",
      clientTime: 1,
      gameClock: createGameClockStub([1_000, 1_007]),
      output,
    });

    expect(output.publishPongToSocket).toHaveBeenCalledWith(
      expect.objectContaining({ serverSentElapsedMs: 1_007 }),
    );
  });

  it("PONGに壁時計由来のフィールドを載せないこと", () => {
    const output = createOutputStub();

    pingUseCase({
      socketId: "socket-1",
      clientTime: 42,
      gameClock: createGameClockStub([1_000, 1_007]),
      output,
    });

    expect(output.publishPongToSocket).toHaveBeenCalledWith({
      clientTime: 42,
      serverReceivedElapsedMs: 1_000,
      serverSentElapsedMs: 1_007,
    });
  });

  it("カウントダウン中は負の経過msをそのまま返すこと", () => {
    const output = createOutputStub();

    pingUseCase({
      socketId: "socket-1",
      clientTime: 1,
      gameClock: createGameClockStub([-4_000, -3_990]),
      output,
    });

    expect(output.publishPongToSocket).toHaveBeenCalledWith({
      clientTime: 1,
      serverReceivedElapsedMs: -4_000,
      serverSentElapsedMs: -3_990,
    });
  });

  it("ゲーム経過msが0でもPONGを返すこと", () => {
    const output = createOutputStub();

    pingUseCase({
      socketId: "socket-1",
      clientTime: 1,
      gameClock: createGameClockStub([0]),
      output,
    });

    expect(output.publishPongToSocket).toHaveBeenCalledTimes(1);
  });

  it("PONG送信を1回だけ実行すること", () => {
    const output = createOutputStub();

    pingUseCase({
      socketId: "socket-1",
      clientTime: 1,
      gameClock: createGameClockStub([1_000]),
      output,
    });

    expect(output.publishPongToSocket).toHaveBeenCalledTimes(1);
  });

  it("セッション未開始の場合はPONGを返さないこと", () => {
    const output = createOutputStub();

    pingUseCase({
      socketId: "socket-1",
      clientTime: 1,
      gameClock: createGameClockStub([undefined]),
      output,
    });

    expect(output.publishPongToSocket).not.toHaveBeenCalled();
  });

  it("セッション未開始の場合はセッション未開始として記録すること", () => {
    const output = createOutputStub();

    pingUseCase({
      socketId: "socket-1",
      clientTime: 1,
      gameClock: createGameClockStub([undefined]),
      output,
    });

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.GAME_USE_CASE}]`, {
      event: gameUseCaseLogEvents.PING,
      result: logResults.IGNORED_SESSION_NOT_STARTED,
      socketId: "socket-1",
    });
  });

  it("送信時点で時計が引けなくなった場合は受信時点の値へ倒すこと", () => {
    const output = createOutputStub();

    pingUseCase({
      socketId: "socket-1",
      clientTime: 1,
      gameClock: createGameClockStub([1_000, undefined]),
      output,
    });

    expect(output.publishPongToSocket).toHaveBeenCalledWith({
      clientTime: 1,
      serverReceivedElapsedMs: 1_000,
      serverSentElapsedMs: 1_000,
    });
  });
});
