/**
 * GameSyncHandler.test
 * 時刻同期ソケット操作の現行挙動を固定する characterization test
 * PING送信イベント名とPONG購読解除の委譲を検証する
 */
import type { Socket } from "socket.io-client";
import { describe, expect, it } from "vitest";

import { createGameSyncHandler } from "./GameSyncHandler";

/** 呼び出し記録付きのソケットスタブを生成する */
const createSocketStub = () => {
  const onCalls: { event: string; callback: unknown }[] = [];
  const offCalls: { event: string; callback: unknown }[] = [];
  const emitCalls: { event: string; args: unknown[] }[] = [];

  const socket = {
    on: (event: string, callback: unknown) => {
      onCalls.push({ event, callback });
    },
    once: () => undefined,
    off: (event: string, callback: unknown) => {
      offCalls.push({ event, callback });
    },
    emit: (event: string, ...args: unknown[]) => {
      emitCalls.push({ event, args });
    },
  } as unknown as Socket;

  return { socket, onCalls, offCalls, emitCalls };
};

describe("createGameSyncHandler", () => {
  it("PONG購読をpongイベントへ登録すること", () => {
    const { socket, onCalls } = createSocketStub();
    const handler = createGameSyncHandler(socket);
    const callback = () => undefined;

    handler.onPong(callback);

    expect(onCalls).toEqual([{ event: "pong", callback }]);
  });

  it("PONG購読解除をpongイベントへ委譲すること", () => {
    const { socket, offCalls } = createSocketStub();
    const handler = createGameSyncHandler(socket);
    const callback = () => undefined;

    handler.offPong(callback);

    expect(offCalls).toEqual([{ event: "pong", callback }]);
  });

  it("PING送信をpingイベントとクライアント時刻で行うこと", () => {
    const { socket, emitCalls } = createSocketStub();
    const handler = createGameSyncHandler(socket);

    handler.sendPing(1234);

    expect(emitCalls).toEqual([{ event: "ping", args: [1234] }]);
  });

  it("クライアント時刻0でもそのまま送信すること", () => {
    const { socket, emitCalls } = createSocketStub();
    const handler = createGameSyncHandler(socket);

    handler.sendPing(0);

    expect(emitCalls).toEqual([{ event: "ping", args: [0] }]);
  });

  it("生成時点ではソケット操作を行わないこと", () => {
    const { socket, onCalls, offCalls, emitCalls } = createSocketStub();

    createGameSyncHandler(socket);

    expect({ onCalls, offCalls, emitCalls }).toEqual({
      onCalls: [],
      offCalls: [],
      emitCalls: [],
    });
  });

  it("複数回のPING送信を都度委譲すること", () => {
    const { socket, emitCalls } = createSocketStub();
    const handler = createGameSyncHandler(socket);

    handler.sendPing(1);
    handler.sendPing(2);

    expect(emitCalls).toHaveLength(2);
  });
});
