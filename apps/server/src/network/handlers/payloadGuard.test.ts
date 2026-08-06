/**
 * payloadGuard.test
 * ペイロード検証ガードの現行挙動を固定する characterization test
 * 検証成功時の無ログ通過と失敗時の不正ペイロードログ記録を検証する
 */
import { contracts as protocol } from "@repo/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logResults, logScopes } from "@server/logging/index";
import { createPayloadGuard } from "./payloadGuard";

/** テスト用の常に成功する検証関数 */
const alwaysValid = (payload: unknown): payload is string => {
  return true;
};

/** テスト用の常に失敗する検証関数 */
const alwaysInvalid = (payload: unknown): payload is string => {
  return false;
};

/** 非空文字列のみ通す検証関数 */
const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.length > 0;
};

/** 受け取ったペイロードを記録する検証関数を生成する */
const createRecordingValidator = () => {
  const receivedPayloads: unknown[] = [];
  const validator = (payload: unknown): payload is string => {
    receivedPayloads.push(payload);
    return isNonEmptyString(payload);
  };

  return { validator, receivedPayloads };
};

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createPayloadGuard.isValidPayload", () => {
  it("検証関数がtrueを返す場合はtrueを返すこと", () => {
    const guard = createPayloadGuard("socket-1");

    expect(
      guard.isValidPayload(protocol.SocketEvents.MOVE, { x: 1 }, alwaysValid),
    ).toBe(true);
  });

  it("検証成功時はログを出力しないこと", () => {
    const guard = createPayloadGuard("socket-1");

    guard.isValidPayload(protocol.SocketEvents.MOVE, { x: 1 }, alwaysValid);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("検証関数がfalseを返す場合はfalseを返すこと", () => {
    const guard = createPayloadGuard("socket-1");

    expect(
      guard.isValidPayload(protocol.SocketEvents.MOVE, { x: 1 }, alwaysInvalid),
    ).toBe(false);
  });

  it("検証失敗時はNetworkスコープでログを出力すること", () => {
    const guard = createPayloadGuard("socket-1");

    guard.isValidPayload(protocol.SocketEvents.MOVE, null, alwaysInvalid);

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: protocol.SocketEvents.MOVE,
      result: logResults.IGNORED_INVALID_PAYLOAD,
      socketId: "socket-1",
    });
  });

  it("検証失敗時のログは1回のみ出力すること", () => {
    const guard = createPayloadGuard("socket-1");

    guard.isValidPayload(protocol.SocketEvents.MOVE, null, alwaysInvalid);

    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("生成時に渡したsocketIdをログへ含めること", () => {
    const guard = createPayloadGuard("socket-xyz");

    guard.isValidPayload(protocol.SocketEvents.PING, "invalid", alwaysInvalid);

    expect(logSpy).toHaveBeenCalledWith(
      `[${logScopes.NETWORK}]`,
      expect.objectContaining({ socketId: "socket-xyz" }),
    );
  });

  it("socketIdが空文字でもそのままログへ含めること", () => {
    const guard = createPayloadGuard("");

    guard.isValidPayload(protocol.SocketEvents.PING, "invalid", alwaysInvalid);

    expect(logSpy).toHaveBeenCalledWith(
      `[${logScopes.NETWORK}]`,
      expect.objectContaining({ socketId: "" }),
    );
  });

  it("JOIN_ROOMの失敗時は該当イベント名をログへ含めること", () => {
    const guard = createPayloadGuard("socket-1");

    guard.isValidPayload(protocol.SocketEvents.JOIN_ROOM, {}, alwaysInvalid);

    expect(logSpy).toHaveBeenCalledWith(
      `[${logScopes.NETWORK}]`,
      expect.objectContaining({ event: protocol.SocketEvents.JOIN_ROOM }),
    );
  });

  it("PLACE_BOMBの失敗時は該当イベント名をログへ含めること", () => {
    const guard = createPayloadGuard("socket-1");

    guard.isValidPayload(protocol.SocketEvents.PLACE_BOMB, {}, alwaysInvalid);

    expect(logSpy).toHaveBeenCalledWith(
      `[${logScopes.NETWORK}]`,
      expect.objectContaining({ event: protocol.SocketEvents.PLACE_BOMB }),
    );
  });

  it("BOMB_HIT_REPORTの失敗時は該当イベント名をログへ含めること", () => {
    const guard = createPayloadGuard("socket-1");

    guard.isValidPayload(
      protocol.SocketEvents.BOMB_HIT_REPORT,
      {},
      alwaysInvalid,
    );

    expect(logSpy).toHaveBeenCalledWith(
      `[${logScopes.NETWORK}]`,
      expect.objectContaining({
        event: protocol.SocketEvents.BOMB_HIT_REPORT,
      }),
    );
  });

  it("LOBBY_SETTINGS_UPDATEの失敗時は該当イベント名をログへ含めること", () => {
    const guard = createPayloadGuard("socket-1");

    guard.isValidPayload(
      protocol.SocketEvents.LOBBY_SETTINGS_UPDATE,
      {},
      alwaysInvalid,
    );

    expect(logSpy).toHaveBeenCalledWith(
      `[${logScopes.NETWORK}]`,
      expect.objectContaining({
        event: protocol.SocketEvents.LOBBY_SETTINGS_UPDATE,
      }),
    );
  });

  it("SELECT_TEAMの失敗時は該当イベント名をログへ含めること", () => {
    const guard = createPayloadGuard("socket-1");

    guard.isValidPayload(protocol.SocketEvents.SELECT_TEAM, {}, alwaysInvalid);

    expect(logSpy).toHaveBeenCalledWith(
      `[${logScopes.NETWORK}]`,
      expect.objectContaining({ event: protocol.SocketEvents.SELECT_TEAM }),
    );
  });

  it("検証関数へ受け取ったペイロードをそのまま渡すこと", () => {
    const guard = createPayloadGuard("socket-1");
    const { validator, receivedPayloads } = createRecordingValidator();
    const payload = { value: 1 };

    guard.isValidPayload(protocol.SocketEvents.MOVE, payload, validator);

    expect(receivedPayloads).toEqual([payload]);
  });

  it("undefinedのペイロードも検証関数へ渡すこと", () => {
    const guard = createPayloadGuard("socket-1");
    const { validator, receivedPayloads } = createRecordingValidator();

    guard.isValidPayload(protocol.SocketEvents.MOVE, undefined, validator);

    expect(receivedPayloads).toEqual([undefined]);
  });

  it("失敗が続く場合は呼び出し回数分ログを出力すること", () => {
    const guard = createPayloadGuard("socket-1");

    guard.isValidPayload(protocol.SocketEvents.MOVE, null, alwaysInvalid);
    guard.isValidPayload(protocol.SocketEvents.MOVE, null, alwaysInvalid);

    expect(logSpy).toHaveBeenCalledTimes(2);
  });
});

describe("createPayloadGuard.guardOnEvent", () => {
  it("イベントを束縛したガード関数を返すこと", () => {
    const guard = createPayloadGuard("socket-1");

    const isValid = guard.guardOnEvent(
      protocol.SocketEvents.MOVE,
      isNonEmptyString,
    );

    expect(typeof isValid).toBe("function");
  });

  it("束縛したガードが検証成功時にtrueを返すこと", () => {
    const guard = createPayloadGuard("socket-1");
    const isValid = guard.guardOnEvent(
      protocol.SocketEvents.MOVE,
      isNonEmptyString,
    );

    expect(isValid("payload")).toBe(true);
  });

  it("束縛したガードが検証失敗時にfalseを返すこと", () => {
    const guard = createPayloadGuard("socket-1");
    const isValid = guard.guardOnEvent(
      protocol.SocketEvents.MOVE,
      isNonEmptyString,
    );

    expect(isValid("")).toBe(false);
  });

  it("束縛したガードの失敗時は束縛イベントのログを出力すること", () => {
    const guard = createPayloadGuard("socket-2");
    const isValid = guard.guardOnEvent(
      protocol.SocketEvents.PING,
      isNonEmptyString,
    );

    isValid(123);

    expect(logSpy).toHaveBeenCalledWith(`[${logScopes.NETWORK}]`, {
      event: protocol.SocketEvents.PING,
      result: logResults.IGNORED_INVALID_PAYLOAD,
      socketId: "socket-2",
    });
  });

  it("束縛したガードは呼び出しごとに検証関数を実行すること", () => {
    const guard = createPayloadGuard("socket-1");
    const { validator, receivedPayloads } = createRecordingValidator();
    const isValid = guard.guardOnEvent(protocol.SocketEvents.MOVE, validator);

    isValid("a");
    isValid("b");

    expect(receivedPayloads).toEqual(["a", "b"]);
  });

  it("同一ガードから生成した別イベントのガードは互いに影響しないこと", () => {
    const guard = createPayloadGuard("socket-1");
    const isMoveValid = guard.guardOnEvent(
      protocol.SocketEvents.MOVE,
      isNonEmptyString,
    );
    const isPingValid = guard.guardOnEvent(
      protocol.SocketEvents.PING,
      isNonEmptyString,
    );

    isMoveValid("ok");
    isPingValid(1);

    expect(logSpy).toHaveBeenCalledTimes(1);
  });
});
