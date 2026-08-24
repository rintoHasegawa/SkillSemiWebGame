/**
 * runGameSceneInit.test
 * ゲームシーン初期化ラッパの結果分岐を検証する
 * 成功・失敗・中断の判別可能ユニオンと破棄判定の順序を確認する
 */
import { describe, expect, it, vi } from "vitest";

import { runGameSceneInit } from "./runGameSceneInit";

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason: unknown) => void;
};

// 初期化の解決タイミングをテストから制御するための手動 deferred
const createDeferred = (): Deferred => {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((resolveInit, rejectInit) => {
    resolve = resolveInit;
    reject = rejectInit;
  });

  return { promise, resolve, reject };
};

describe("runGameSceneInit", () => {
  it("初期化が失敗し破棄されていない場合は失敗結果を返すこと", async () => {
    const result = await runGameSceneInit({
      init: () => Promise.reject(new Error("初期化に失敗")),
      isDisposed: () => false,
    });

    expect(result.status).toBe("failed");
  });

  it("失敗結果には reject された値がそのまま入ること", async () => {
    const error = new Error("初期化に失敗");

    const result = await runGameSceneInit({
      init: () => Promise.reject(error),
      isDisposed: () => false,
    });

    const failedError = result.status === "failed" ? result.error : null;

    expect(failedError).toBe(error);
  });

  it("初期化が同期例外を投げた場合も失敗結果を返すこと", async () => {
    const error = new Error("同期例外");

    const result = await runGameSceneInit({
      init: () => {
        throw error;
      },
      isDisposed: () => false,
    });

    const failedError = result.status === "failed" ? result.error : null;

    expect(failedError).toBe(error);
  });

  it("初期化が失敗しても破棄済みなら中断結果を返すこと", async () => {
    const result = await runGameSceneInit({
      init: () => Promise.reject(new Error("初期化に失敗")),
      isDisposed: () => true,
    });

    expect(result).toEqual({ status: "aborted" });
  });

  it("初期化が成功し破棄されていない場合は初期化完了結果を返すこと", async () => {
    const result = await runGameSceneInit({
      init: () => Promise.resolve(),
      isDisposed: () => false,
    });

    expect(result).toEqual({ status: "initialized" });
  });

  it("初期化が成功しても破棄済みなら中断結果を返すこと", async () => {
    const result = await runGameSceneInit({
      init: () => Promise.resolve(),
      isDisposed: () => true,
    });

    expect(result).toEqual({ status: "aborted" });
  });

  it("初期化が失敗しても自身は reject しないこと", async () => {
    const handleRejected = vi.fn();

    await runGameSceneInit({
      init: () => Promise.reject(new Error("初期化に失敗")),
      isDisposed: () => false,
    }).catch(handleRejected);

    expect(handleRejected).not.toHaveBeenCalled();
  });

  it("初期化失敗の到着後に破棄済みとなった場合も中断結果を返すこと", async () => {
    const deferred = createDeferred();
    let isDisposed = false;

    // await 前ではなく await 後に破棄状態を判定していることを確認する
    const resultPromise = runGameSceneInit({
      init: () => deferred.promise,
      isDisposed: () => isDisposed,
    });
    isDisposed = true;
    deferred.reject(new Error("初期化に失敗"));

    await expect(resultPromise).resolves.toEqual({ status: "aborted" });
  });

  it("初期化成功の到着後に破棄済みとなった場合も中断結果を返すこと", async () => {
    const deferred = createDeferred();
    let isDisposed = false;

    // await 前ではなく await 後に破棄状態を判定していることを確認する
    const resultPromise = runGameSceneInit({
      init: () => deferred.promise,
      isDisposed: () => isDisposed,
    });
    isDisposed = true;
    deferred.resolve();

    await expect(resultPromise).resolves.toEqual({ status: "aborted" });
  });
});
