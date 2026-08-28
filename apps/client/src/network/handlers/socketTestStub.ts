/**
 * socketTestStub
 * テスト向けに呼び出し記録付きのソケットスタブを提供する
 * on/once/off/emit の結線先イベント名と引数を検証するテストで共用する
 */
import type { Socket } from "socket.io-client";

/** 呼び出し記録付きのソケットスタブを生成する */
export const createSocketStub = () => {
  const onCalls: { event: string; callback: unknown }[] = [];
  const onceCalls: { event: string; callback: unknown }[] = [];
  const offCalls: { event: string; callback: unknown }[] = [];
  const emitCalls: { event: string; args: unknown[] }[] = [];

  const socket = {
    on: (event: string, callback: unknown) => {
      onCalls.push({ event, callback });
    },
    once: (event: string, callback: unknown) => {
      onceCalls.push({ event, callback });
    },
    off: (event: string, callback: unknown) => {
      offCalls.push({ event, callback });
    },
    emit: (event: string, ...args: unknown[]) => {
      emitCalls.push({ event, args });
    },
  } as unknown as Socket;

  return { socket, onCalls, onceCalls, offCalls, emitCalls };
};
