/**
 * appUpdater.test
 * 壊れたページの事後復旧（遅延チャンク取得失敗・プロトコル版不一致）の仕様を検証する
 * 「更新チェック → 待機中の版を適用 → 適用できなければ素のリロード」の順序と，
 * 1 セッション 1 回の制限，および復旧種別ごとの記録の独立性
 * （Issue #375 受け入れ条件）を対象とする
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CHUNK_RECOVERY_RELOAD_SESSION_KEY,
  PROTOCOL_RECOVERY_RELOAD_SESSION_KEY,
  UPDATE_RELOAD_SESSION_KEY,
} from "./updateSession";

/** registerSW に渡されるコールバック（利用している範囲のみ） */
type RegisterSWOptions = {
  immediate?: boolean;
  onRegisteredSW?: (
    swScriptUrl: string,
    registration: ServiceWorkerRegistration | undefined,
  ) => void;
  onNeedRefresh?: () => void;
  onRegisterError?: (error: unknown) => void;
};

// vi.mock の巻き上げより先に初期化されるようにする
const pwaRegister = vi.hoisted(() => {
  const state: { options: RegisterSWOptions | null } = { options: null };
  const updateServiceWorker = vi.fn(async (_reloadPage?: boolean) => {});
  const registerSW = vi.fn((options: RegisterSWOptions) => {
    state.options = options;
    return updateServiceWorker;
  });

  return { state, registerSW, updateServiceWorker };
});

vi.mock("virtual:pwa-register", () => ({
  registerSW: pwaRegister.registerSW,
}));

/** メモリ上で動作する sessionStorage 代替を生成する */
const createMemoryStorage = () => {
  const store = new Map<string, string>();

  return {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
    clear: (): void => {
      store.clear();
    },
  };
};

const reloadMock = vi.fn();
const swUpdateMock = vi.fn(async () => {});

beforeEach(() => {
  // モジュールスコープの登録状態を持つため，ケースごとに読み直す
  vi.resetModules();
  pwaRegister.state.options = null;
  pwaRegister.registerSW.mockClear();
  pwaRegister.updateServiceWorker.mockClear();
  reloadMock.mockClear();
  swUpdateMock.mockClear();
  vi.stubGlobal("sessionStorage", createMemoryStorage());
  vi.stubGlobal("window", { location: { reload: reloadMock } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/**
 * Service Worker を登録済みの状態にする
 * needRefresh を true にすると新しい版が待機状態になった状況を再現する
 */
const setUpRegisteredUpdater = async (options: { needRefresh: boolean }) => {
  const appUpdater = await import("./appUpdater");

  appUpdater.initializeAppUpdater();

  const swOptions = pwaRegister.state.options;
  if (swOptions === null) {
    throw new Error("registerSW が呼ばれていない");
  }

  swOptions.onRegisteredSW?.("/sw.js", {
    update: swUpdateMock,
  } as unknown as ServiceWorkerRegistration);

  if (options.needRefresh) {
    swOptions.onNeedRefresh?.();
  }

  return appUpdater;
};

describe("recoverFromChunkLoadFailure", () => {
  it("初回はセッションキーを記録すること", async () => {
    const { recoverFromChunkLoadFailure } = await setUpRegisteredUpdater({
      needRefresh: false,
    });

    await recoverFromChunkLoadFailure();

    expect(sessionStorage.getItem(CHUNK_RECOVERY_RELOAD_SESSION_KEY)).not.toBe(
      null,
    );
  });

  it("復旧の前に更新チェックを行うこと", async () => {
    const { recoverFromChunkLoadFailure } = await setUpRegisteredUpdater({
      needRefresh: false,
    });

    await recoverFromChunkLoadFailure();

    expect(swUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("待機中の更新が無い場合は素のリロードで復旧すること", async () => {
    // Service Worker 管理外のページでは新しい版が既に活性化済みで待機しない
    const { recoverFromChunkLoadFailure } = await setUpRegisteredUpdater({
      needRefresh: false,
    });

    await expect(recoverFromChunkLoadFailure()).resolves.toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("待機中の更新がある場合は更新を適用し素のリロードはしないこと", async () => {
    const { recoverFromChunkLoadFailure } = await setUpRegisteredUpdater({
      needRefresh: true,
    });

    await expect(recoverFromChunkLoadFailure()).resolves.toBe(true);
    expect(pwaRegister.updateServiceWorker).toHaveBeenCalledWith(true);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("同一セッションの 2 回目は復旧を開始せず false を返すこと", async () => {
    const { recoverFromChunkLoadFailure } = await setUpRegisteredUpdater({
      needRefresh: false,
    });
    await recoverFromChunkLoadFailure();
    reloadMock.mockClear();

    await expect(recoverFromChunkLoadFailure()).resolves.toBe(false);
  });

  it("同一セッションの 2 回目はリロードしないこと", async () => {
    // 解消しなかった場合は既存のエラー表示へフォールバックする
    const { recoverFromChunkLoadFailure } = await setUpRegisteredUpdater({
      needRefresh: false,
    });
    await recoverFromChunkLoadFailure();
    reloadMock.mockClear();

    await recoverFromChunkLoadFailure();

    expect(reloadMock).not.toHaveBeenCalled();
  });

  it("Service Worker が未登録でも素のリロードで復旧すること", async () => {
    const { recoverFromChunkLoadFailure } = await import("./appUpdater");

    await expect(recoverFromChunkLoadFailure()).resolves.toBe(true);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});

describe("復旧種別ごとのセッション記録", () => {
  it("チャンク復旧の実施が版不一致復旧の 1 回分を消費しないこと", async () => {
    const { recoverFromChunkLoadFailure, recoverFromProtocolVersionMismatch } =
      await setUpRegisteredUpdater({ needRefresh: false });
    await recoverFromChunkLoadFailure();

    await expect(recoverFromProtocolVersionMismatch()).resolves.toBe(true);
    expect(
      sessionStorage.getItem(PROTOCOL_RECOVERY_RELOAD_SESSION_KEY),
    ).not.toBe(null);
  });

  it("版不一致復旧の実施がチャンク復旧の 1 回分を消費しないこと", async () => {
    const { recoverFromChunkLoadFailure, recoverFromProtocolVersionMismatch } =
      await setUpRegisteredUpdater({ needRefresh: false });
    await recoverFromProtocolVersionMismatch();

    await expect(recoverFromChunkLoadFailure()).resolves.toBe(true);
    expect(sessionStorage.getItem(CHUNK_RECOVERY_RELOAD_SESSION_KEY)).not.toBe(
      null,
    );
  });

  it("チャンク復旧では更新適用のリロード記録を消費しないこと", async () => {
    // 待機中の更新が無いリロードは #368 のゲート（1 セッション 1 回）と無関係である
    const { recoverFromChunkLoadFailure } = await setUpRegisteredUpdater({
      needRefresh: false,
    });

    await recoverFromChunkLoadFailure();

    expect(sessionStorage.getItem(UPDATE_RELOAD_SESSION_KEY)).toBe(null);
  });
});
