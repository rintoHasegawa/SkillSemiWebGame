/**
 * updateSession.test
 * 更新適用のリロードを 1 セッション 1 回に制限する記録の仕様を検証する
 * 未マーク→マーク→マーク済み判定と，sessionStorage が使えない環境での
 * フォールバック（Issue #368 受け入れ条件）を対象とする
 * あわせて遅延チャンク取得失敗の復旧キーが他の記録と独立であること
 * （Issue #375 受け入れ条件）を検証する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CHUNK_RECOVERY_RELOAD_SESSION_KEY,
  hasRecoveredFromChunkErrorInSession,
  hasRecoveredFromProtocolMismatchInSession,
  hasReloadedForUpdateInSession,
  hasSessionMark,
  markSession,
  PROTOCOL_RECOVERY_RELOAD_SESSION_KEY,
  UPDATE_RELOAD_SESSION_KEY,
} from "./updateSession";

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

/** 読み書きの双方で例外を投げる sessionStorage 代替を生成する */
const createThrowingStorage = () => {
  return {
    getItem: (): string | null => {
      throw new Error("storage is not available");
    },
    setItem: (): void => {
      throw new Error("storage is not available");
    },
  };
};

beforeEach(() => {
  vi.stubGlobal("sessionStorage", createMemoryStorage());
  // 保存失敗時のログ出力でテスト出力が汚れないよう差し替える
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("hasSessionMark", () => {
  it("記録前は false を返すこと", () => {
    expect(hasSessionMark(UPDATE_RELOAD_SESSION_KEY)).toBe(false);
  });

  it("記録後は true を返すこと", () => {
    markSession(UPDATE_RELOAD_SESSION_KEY);

    expect(hasSessionMark(UPDATE_RELOAD_SESSION_KEY)).toBe(true);
  });

  it("別キーの記録では true にならないこと", () => {
    markSession(PROTOCOL_RECOVERY_RELOAD_SESSION_KEY);

    expect(hasSessionMark(UPDATE_RELOAD_SESSION_KEY)).toBe(false);
  });

  it("sessionStorage の参照が例外を投げる場合は false を返すこと", () => {
    vi.stubGlobal("sessionStorage", createThrowingStorage());

    expect(hasSessionMark(UPDATE_RELOAD_SESSION_KEY)).toBe(false);
  });

  it("sessionStorage が存在しない環境では false を返すこと", () => {
    vi.stubGlobal("sessionStorage", undefined);

    expect(hasSessionMark(UPDATE_RELOAD_SESSION_KEY)).toBe(false);
  });
});

describe("markSession", () => {
  it("同じキーを二度記録しても記録済み判定が保たれること", () => {
    markSession(UPDATE_RELOAD_SESSION_KEY);
    markSession(UPDATE_RELOAD_SESSION_KEY);

    expect(hasSessionMark(UPDATE_RELOAD_SESSION_KEY)).toBe(true);
  });

  it("sessionStorage の書き込みが例外を投げても例外を伝播させないこと", () => {
    vi.stubGlobal("sessionStorage", createThrowingStorage());

    expect(() => markSession(UPDATE_RELOAD_SESSION_KEY)).not.toThrow();
  });

  it("sessionStorage が存在しない環境でも例外を投げないこと", () => {
    vi.stubGlobal("sessionStorage", undefined);

    expect(() => markSession(UPDATE_RELOAD_SESSION_KEY)).not.toThrow();
  });
});

describe("hasReloadedForUpdateInSession", () => {
  it("更新適用のリロード前は false を返すこと", () => {
    expect(hasReloadedForUpdateInSession()).toBe(false);
  });

  it("更新適用のリロードを記録すると true を返すこと", () => {
    markSession(UPDATE_RELOAD_SESSION_KEY);

    expect(hasReloadedForUpdateInSession()).toBe(true);
  });

  it("版不一致の復旧記録では true にならないこと", () => {
    markSession(PROTOCOL_RECOVERY_RELOAD_SESSION_KEY);

    expect(hasReloadedForUpdateInSession()).toBe(false);
  });
});

describe("hasRecoveredFromProtocolMismatchInSession", () => {
  it("復旧の試行前は false を返すこと", () => {
    expect(hasRecoveredFromProtocolMismatchInSession()).toBe(false);
  });

  it("復旧の試行を記録すると true を返すこと", () => {
    markSession(PROTOCOL_RECOVERY_RELOAD_SESSION_KEY);

    expect(hasRecoveredFromProtocolMismatchInSession()).toBe(true);
  });

  it("更新適用のリロード記録では true にならないこと", () => {
    markSession(UPDATE_RELOAD_SESSION_KEY);

    expect(hasRecoveredFromProtocolMismatchInSession()).toBe(false);
  });

  it("チャンク取得失敗の復旧記録では true にならないこと", () => {
    // チャンク復旧が版不一致復旧の 1 回分を消費してはならない
    markSession(CHUNK_RECOVERY_RELOAD_SESSION_KEY);

    expect(hasRecoveredFromProtocolMismatchInSession()).toBe(false);
  });
});

describe("hasRecoveredFromChunkErrorInSession", () => {
  it("復旧の試行前は false を返すこと", () => {
    expect(hasRecoveredFromChunkErrorInSession()).toBe(false);
  });

  it("復旧の試行を記録すると true を返すこと", () => {
    markSession(CHUNK_RECOVERY_RELOAD_SESSION_KEY);

    expect(hasRecoveredFromChunkErrorInSession()).toBe(true);
  });

  it("版不一致の復旧記録では true にならないこと", () => {
    // 版不一致復旧がチャンク復旧の 1 回分を消費してはならない
    markSession(PROTOCOL_RECOVERY_RELOAD_SESSION_KEY);

    expect(hasRecoveredFromChunkErrorInSession()).toBe(false);
  });

  it("更新適用のリロード記録では true にならないこと", () => {
    markSession(UPDATE_RELOAD_SESSION_KEY);

    expect(hasRecoveredFromChunkErrorInSession()).toBe(false);
  });
});

describe("セッションキー", () => {
  it("更新適用と版不一致復旧で別のキーを用いること", () => {
    expect(UPDATE_RELOAD_SESSION_KEY).not.toBe(
      PROTOCOL_RECOVERY_RELOAD_SESSION_KEY,
    );
  });

  it("更新適用・版不一致復旧・チャンク復旧で互いに異なるキーを用いること", () => {
    const keys = [
      UPDATE_RELOAD_SESSION_KEY,
      PROTOCOL_RECOVERY_RELOAD_SESSION_KEY,
      CHUNK_RECOVERY_RELOAD_SESSION_KEY,
    ];

    expect(new Set(keys).size).toBe(keys.length);
  });
});
