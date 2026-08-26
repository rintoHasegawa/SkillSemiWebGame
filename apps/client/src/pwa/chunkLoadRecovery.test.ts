/**
 * chunkLoadRecovery.test
 * 遅延チャンク取得失敗（`vite:preloadError`）の捕捉と復旧開始の仕様を検証する
 * 復旧を開始したときのみ既定動作（エラーの再スロー）を止めること，
 * 同一セッションで復旧済みならエラー表示へフォールバックすること
 * （Issue #375 受け入れ条件）を対象とする
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock の巻き上げより先に初期化されるようにする
const mocks = vi.hoisted(() => ({
  hasRecoveredFromChunkErrorInSession: vi.fn(() => false),
  recoverFromChunkLoadFailure: vi.fn(async () => true),
}));

vi.mock("./updateSession", () => ({
  hasRecoveredFromChunkErrorInSession:
    mocks.hasRecoveredFromChunkErrorInSession,
}));

vi.mock("./appUpdater", () => ({
  recoverFromChunkLoadFailure: mocks.recoverFromChunkLoadFailure,
}));

/** 取得失敗イベント（Vite は cancelable な `vite:preloadError` を発火する） */
const createPreloadErrorEvent = (): Event => {
  return new Event("vite:preloadError", { cancelable: true });
};

/**
 * ハンドラを読み込む
 * 同一ページ内の復旧開始状態をモジュールスコープで保持するため，ケースごとに読み直す
 */
const importRecovery = async () => {
  return await import("./chunkLoadRecovery");
};

/**
 * 復旧開始フラグの戻し（`recoverFromChunkLoadFailure()` の解決後に走るマイクロタスク）が
 * 反映されるまで待つ
 */
const flushRecoverySettlement = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
};

beforeEach(() => {
  vi.resetModules();
  mocks.hasRecoveredFromChunkErrorInSession.mockReset();
  mocks.hasRecoveredFromChunkErrorInSession.mockReturnValue(false);
  mocks.recoverFromChunkLoadFailure.mockReset();
  mocks.recoverFromChunkLoadFailure.mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("handleChunkPreloadError", () => {
  it("未試行なら復旧を開始すること", async () => {
    const { handleChunkPreloadError } = await importRecovery();

    handleChunkPreloadError(createPreloadErrorEvent());

    expect(mocks.recoverFromChunkLoadFailure).toHaveBeenCalledTimes(1);
  });

  it("未試行なら既定動作を止めること", async () => {
    // 既定動作（Vite による再スロー）を止め，二重のエラー表示を防ぐ
    const { handleChunkPreloadError } = await importRecovery();
    const event = createPreloadErrorEvent();

    handleChunkPreloadError(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("同一セッションで復旧済みなら復旧を開始しないこと", async () => {
    mocks.hasRecoveredFromChunkErrorInSession.mockReturnValue(true);
    const { handleChunkPreloadError } = await importRecovery();

    handleChunkPreloadError(createPreloadErrorEvent());

    expect(mocks.recoverFromChunkLoadFailure).not.toHaveBeenCalled();
  });

  it("同一セッションで復旧済みなら既定動作を止めないこと", async () => {
    // 既存のエラー表示（GameInitErrorOverlay 等）へフォールバックさせる
    mocks.hasRecoveredFromChunkErrorInSession.mockReturnValue(true);
    const { handleChunkPreloadError } = await importRecovery();
    const event = createPreloadErrorEvent();

    handleChunkPreloadError(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("同一ページで 2 件目のエラーも既定動作を止めること", async () => {
    // 複数チャンクが同時に失敗してもエラー表示を重ねない
    const { handleChunkPreloadError } = await importRecovery();
    handleChunkPreloadError(createPreloadErrorEvent());
    const secondEvent = createPreloadErrorEvent();

    handleChunkPreloadError(secondEvent);

    expect(secondEvent.defaultPrevented).toBe(true);
  });

  it("同一ページで 2 件目のエラーでは復旧を再開しないこと", async () => {
    const { handleChunkPreloadError } = await importRecovery();
    handleChunkPreloadError(createPreloadErrorEvent());

    handleChunkPreloadError(createPreloadErrorEvent());

    expect(mocks.recoverFromChunkLoadFailure).toHaveBeenCalledTimes(1);
  });

  it("復旧が失敗しても例外を伝播させないこと", async () => {
    mocks.recoverFromChunkLoadFailure.mockRejectedValue(
      new Error("recovery failed"),
    );
    const { handleChunkPreloadError } = await importRecovery();

    expect(() =>
      handleChunkPreloadError(createPreloadErrorEvent()),
    ).not.toThrow();
    await Promise.resolve();
  });

  it("復旧が失敗したら次のエラーの既定動作を止めないこと", async () => {
    // 復旧を開始できなかった回は開始済み扱いを取り消し，
    // 次のエラーを既存のエラー表示（GameInitErrorOverlay 等）へ落とす
    // 復旧は開始時にセッションキーを記録するため，次のエラーでは復旧済み扱いになる
    mocks.recoverFromChunkLoadFailure.mockImplementation(() => {
      mocks.hasRecoveredFromChunkErrorInSession.mockReturnValue(true);
      return Promise.reject(new Error("recovery failed"));
    });
    const { handleChunkPreloadError } = await importRecovery();
    handleChunkPreloadError(createPreloadErrorEvent());
    await flushRecoverySettlement();
    const secondEvent = createPreloadErrorEvent();

    handleChunkPreloadError(secondEvent);

    expect(secondEvent.defaultPrevented).toBe(false);
  });

  it("復旧が失敗しても次のエラーで復旧を再開しないこと", async () => {
    // 復旧済みセッションでの再試行を防ぎ，リロードのループに入らないようにする
    mocks.recoverFromChunkLoadFailure.mockImplementation(() => {
      mocks.hasRecoveredFromChunkErrorInSession.mockReturnValue(true);
      return Promise.reject(new Error("recovery failed"));
    });
    const { handleChunkPreloadError } = await importRecovery();
    handleChunkPreloadError(createPreloadErrorEvent());
    await flushRecoverySettlement();

    handleChunkPreloadError(createPreloadErrorEvent());

    expect(mocks.recoverFromChunkLoadFailure).toHaveBeenCalledTimes(1);
  });

  it("復旧に入れなかったら次のエラーの既定動作を止めないこと", async () => {
    // 復旧関数が false（復旧に入れない）を返した場合も開始済み扱いを取り消す
    mocks.recoverFromChunkLoadFailure.mockImplementation(() => {
      mocks.hasRecoveredFromChunkErrorInSession.mockReturnValue(true);
      return Promise.resolve(false);
    });
    const { handleChunkPreloadError } = await importRecovery();
    handleChunkPreloadError(createPreloadErrorEvent());
    await flushRecoverySettlement();
    const secondEvent = createPreloadErrorEvent();

    handleChunkPreloadError(secondEvent);

    expect(secondEvent.defaultPrevented).toBe(false);
  });

  it("復旧が進行中なら解決後のエラーも既定動作を止めること", async () => {
    // 復旧（リロード待ち）の間は開始済み扱いを維持し，エラー表示を重ねない
    const { handleChunkPreloadError } = await importRecovery();
    handleChunkPreloadError(createPreloadErrorEvent());
    await flushRecoverySettlement();
    const secondEvent = createPreloadErrorEvent();

    handleChunkPreloadError(secondEvent);

    expect(secondEvent.defaultPrevented).toBe(true);
  });

  it("復旧が進行中なら解決後のエラーで復旧を再開しないこと", async () => {
    const { handleChunkPreloadError } = await importRecovery();
    handleChunkPreloadError(createPreloadErrorEvent());
    await flushRecoverySettlement();

    handleChunkPreloadError(createPreloadErrorEvent());

    expect(mocks.recoverFromChunkLoadFailure).toHaveBeenCalledTimes(1);
  });
});

describe("registerChunkPreloadErrorHandler", () => {
  it("登録後に発火した取得失敗で復旧を開始すること", async () => {
    const eventTarget = new EventTarget();
    vi.stubGlobal("window", eventTarget);
    const { registerChunkPreloadErrorHandler } = await importRecovery();

    registerChunkPreloadErrorHandler();
    eventTarget.dispatchEvent(createPreloadErrorEvent());

    expect(mocks.recoverFromChunkLoadFailure).toHaveBeenCalledTimes(1);
  });

  it("登録後に発火した取得失敗の既定動作を止めること", async () => {
    const eventTarget = new EventTarget();
    vi.stubGlobal("window", eventTarget);
    const { registerChunkPreloadErrorHandler } = await importRecovery();
    const event = createPreloadErrorEvent();

    registerChunkPreloadErrorHandler();
    eventTarget.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("解除関数を呼ぶと取得失敗を捕捉しなくなること", async () => {
    const eventTarget = new EventTarget();
    vi.stubGlobal("window", eventTarget);
    const { registerChunkPreloadErrorHandler } = await importRecovery();

    const unregister = registerChunkPreloadErrorHandler();
    unregister();
    eventTarget.dispatchEvent(createPreloadErrorEvent());

    expect(mocks.recoverFromChunkLoadFailure).not.toHaveBeenCalled();
  });
});
