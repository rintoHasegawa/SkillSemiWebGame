/**
 * sessionToken.test
 * ハンドシェイクのセッショントークン解決の仕様を検証する
 * 未提示・非文字列・空文字・長さ上限の境界を対象とする
 */
import type { Socket } from "socket.io";
import { describe, expect, it } from "vitest";

import { resolveSessionToken } from "./sessionToken";

/** 扱えるトークン長の上限（実装と同じ値を仕様として固定する） */
const MAX_SESSION_TOKEN_LENGTH = 128;

/** ハンドシェイクの auth を差し替えたソケットスタブを生成する */
const createSocketStub = (auth: unknown): Socket => {
  return { handshake: { auth } } as unknown as Socket;
};

describe("resolveSessionToken", () => {
  it("文字列のトークンをそのまま返すこと", () => {
    const socket = createSocketStub({ sessionToken: "token-1" });

    expect(resolveSessionToken(socket)).toBe("token-1");
  });

  it("トークン未提示の場合は undefined を返すこと", () => {
    const socket = createSocketStub({});

    expect(resolveSessionToken(socket)).toBeUndefined();
  });

  it("auth 自体が無い場合は undefined を返すこと", () => {
    const socket = createSocketStub(undefined);

    expect(resolveSessionToken(socket)).toBeUndefined();
  });

  it("空文字のトークンは未提示として扱うこと", () => {
    const socket = createSocketStub({ sessionToken: "" });

    expect(resolveSessionToken(socket)).toBeUndefined();
  });

  it("数値のトークンは未提示として扱うこと", () => {
    const socket = createSocketStub({ sessionToken: 123 });

    expect(resolveSessionToken(socket)).toBeUndefined();
  });

  it("オブジェクトのトークンは未提示として扱うこと", () => {
    const socket = createSocketStub({ sessionToken: { value: "token-1" } });

    expect(resolveSessionToken(socket)).toBeUndefined();
  });

  it("配列のトークンは未提示として扱うこと", () => {
    const socket = createSocketStub({ sessionToken: ["token-1"] });

    expect(resolveSessionToken(socket)).toBeUndefined();
  });

  it("null のトークンは未提示として扱うこと", () => {
    const socket = createSocketStub({ sessionToken: null });

    expect(resolveSessionToken(socket)).toBeUndefined();
  });

  it("真偽値のトークンは未提示として扱うこと", () => {
    const socket = createSocketStub({ sessionToken: true });

    expect(resolveSessionToken(socket)).toBeUndefined();
  });

  it("1文字のトークンを受理すること", () => {
    const socket = createSocketStub({ sessionToken: "a" });

    expect(resolveSessionToken(socket)).toBe("a");
  });

  it("上限ちょうどの長さのトークンを受理すること", () => {
    const token = "a".repeat(MAX_SESSION_TOKEN_LENGTH);
    const socket = createSocketStub({ sessionToken: token });

    expect(resolveSessionToken(socket)).toBe(token);
  });

  it("上限を1文字超えたトークンは未提示として扱うこと", () => {
    const token = "a".repeat(MAX_SESSION_TOKEN_LENGTH + 1);
    const socket = createSocketStub({ sessionToken: token });

    expect(resolveSessionToken(socket)).toBeUndefined();
  });
});
