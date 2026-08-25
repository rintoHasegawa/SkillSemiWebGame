/**
 * protocolVersionGuard.test
 * ハンドシェイクでのプロトコル契約バージョン照合の仕様を検証する
 * 対応版のみ接続を許可し，版ずれ・未送信のクライアントを理由付きで拒否することを対象とする
 * Socket.IO の実接続は行わず，ハンドシェイク情報のみを持つスタブを渡す
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { contracts as protocol } from "@repo/shared";

import {
  createProtocolVersionGuard,
  formatReceivedProtocolVersion,
  isSupportedProtocolVersion,
} from "./protocolVersionGuard";

/** ミドルウェアが受け取るソケットの型 */
type GuardedSocket = Parameters<
  ReturnType<typeof createProtocolVersionGuard>
>[0];

/** ミドルウェアが受け取る next の型 */
type GuardNext = Parameters<ReturnType<typeof createProtocolVersionGuard>>[1];

/** ハンドシェイク情報のみを持つソケットのスタブを生成する */
const createSocketStub = (auth: unknown): GuardedSocket => {
  return {
    id: "socket-1",
    handshake: { auth },
  } as unknown as GuardedSocket;
};

/** 呼び出し引数を記録する next のスタブを生成する */
const createNextSpy = () => {
  const calls: (Error | undefined)[] = [];
  const next = ((error?: Error) => {
    calls.push(error);
  }) as GuardNext;

  return { next, calls };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isSupportedProtocolVersion", () => {
  it("サーバの契約バージョンと一致する値を対応版と判定すること", () => {
    expect(isSupportedProtocolVersion(protocol.PROTOCOL_VERSION)).toBe(true);
  });

  it("異なるバージョン文字列を非対応と判定すること", () => {
    expect(isSupportedProtocolVersion("999")).toBe(false);
  });

  it("未送信（undefined）の旧クライアントを非対応と判定すること", () => {
    expect(isSupportedProtocolVersion(undefined)).toBe(false);
  });

  it("null を非対応と判定すること", () => {
    expect(isSupportedProtocolVersion(null)).toBe(false);
  });

  it("数値の 1 を非対応と判定すること（文字列との型差を許容しない）", () => {
    expect(isSupportedProtocolVersion(1)).toBe(false);
  });

  it("空文字を非対応と判定すること", () => {
    expect(isSupportedProtocolVersion("")).toBe(false);
  });

  it("前後に空白を含む値を非対応と判定すること", () => {
    expect(isSupportedProtocolVersion(` ${protocol.PROTOCOL_VERSION} `)).toBe(
      false,
    );
  });

  it("オブジェクトを非対応と判定すること", () => {
    expect(
      isSupportedProtocolVersion({ protocolVersion: protocol.PROTOCOL_VERSION }),
    ).toBe(false);
  });

  it("真偽値を非対応と判定すること", () => {
    expect(isSupportedProtocolVersion(true)).toBe(false);
  });
});

describe("formatReceivedProtocolVersion", () => {
  it("文字列はそのままログ用文字列にすること", () => {
    expect(formatReceivedProtocolVersion(protocol.PROTOCOL_VERSION)).toBe(
      protocol.PROTOCOL_VERSION,
    );
  });

  it("undefined は unknown にすること", () => {
    expect(formatReceivedProtocolVersion(undefined)).toBe("unknown");
  });

  it("null は unknown にすること", () => {
    expect(formatReceivedProtocolVersion(null)).toBe("unknown");
  });

  it("数値は unknown にすること", () => {
    expect(formatReceivedProtocolVersion(1)).toBe("unknown");
  });

  it("オブジェクトは unknown にすること", () => {
    expect(formatReceivedProtocolVersion({ version: "1" })).toBe("unknown");
  });

  it("長すぎる文字列は 32 文字までに切り詰めること", () => {
    expect(formatReceivedProtocolVersion("a".repeat(100))).toBe("a".repeat(32));
  });

  it("32 文字ちょうどの文字列はそのまま残すこと", () => {
    const boundaryValue = "a".repeat(32);

    expect(formatReceivedProtocolVersion(boundaryValue)).toBe(boundaryValue);
  });

  it("空文字はそのまま空文字にすること", () => {
    expect(formatReceivedProtocolVersion("")).toBe("");
  });
});

describe("createProtocolVersionGuard", () => {
  it("対応版を送ってきた接続を通すこと", () => {
    const { next, calls } = createNextSpy();

    createProtocolVersionGuard()(
      createSocketStub({ protocolVersion: protocol.PROTOCOL_VERSION }),
      next,
    );

    expect(calls).toEqual([undefined]);
  });

  it("対応版の接続ではログを出力しないこと", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { next } = createNextSpy();

    createProtocolVersionGuard()(
      createSocketStub({ protocolVersion: protocol.PROTOCOL_VERSION }),
      next,
    );

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("版ずれの接続を不一致エラーで拒否すること", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { next, calls } = createNextSpy();

    createProtocolVersionGuard()(
      createSocketStub({ protocolVersion: "999" }),
      next,
    );

    expect(calls[0]?.message).toBe(protocol.PROTOCOL_VERSION_MISMATCH_ERROR);
  });

  it("バージョン未送信の旧クライアントを拒否すること", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { next, calls } = createNextSpy();

    createProtocolVersionGuard()(createSocketStub({}), next);

    expect(calls[0]?.message).toBe(protocol.PROTOCOL_VERSION_MISMATCH_ERROR);
  });

  it("auth 自体が無い接続を拒否すること", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { next, calls } = createNextSpy();

    createProtocolVersionGuard()(createSocketStub(undefined), next);

    expect(calls[0]?.message).toBe(protocol.PROTOCOL_VERSION_MISMATCH_ERROR);
  });

  it("拒否時に next を 1 回だけ呼ぶこと", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { next, calls } = createNextSpy();

    createProtocolVersionGuard()(
      createSocketStub({ protocolVersion: "999" }),
      next,
    );

    expect(calls).toHaveLength(1);
  });

  it("拒否時に期待版と受信値を含むログを残すこと", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { next } = createNextSpy();

    createProtocolVersionGuard()(
      createSocketStub({ protocolVersion: "999" }),
      next,
    );

    expect(logSpy.mock.calls[0]?.[1]).toMatchObject({
      result: "rejected_protocol_version",
      socketId: "socket-1",
      expectedProtocolVersion: protocol.PROTOCOL_VERSION,
      receivedProtocolVersion: "999",
    });
  });

  it("拒否ログの受信値は非文字列のとき unknown になること", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { next } = createNextSpy();

    createProtocolVersionGuard()(
      createSocketStub({ protocolVersion: 1 }),
      next,
    );

    expect(logSpy.mock.calls[0]?.[1]).toMatchObject({
      receivedProtocolVersion: "unknown",
    });
  });
});
