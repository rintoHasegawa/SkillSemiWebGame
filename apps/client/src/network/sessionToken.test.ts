/**
 * sessionToken.test
 * 試合復帰用セッショントークンの保持仕様を検証する
 * 初回生成・再取得時の同一性・破棄と再発行に加え，
 * sessionStorage が使えない環境と randomUUID 不在環境での継続動作を対象とする
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearSessionToken,
  loadOrCreateSessionToken,
  renewSessionToken,
} from "./sessionToken";

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
    removeItem: (): void => {
      throw new Error("storage is not available");
    },
  };
};

/** 保存済みのトークンを直接読み出す */
const readStoredToken = (): string | null => {
  return globalThis.sessionStorage.getItem("ppw:session-token");
};

beforeEach(() => {
  vi.stubGlobal("sessionStorage", createMemoryStorage());
  // 保存失敗時のログ出力でテスト出力が汚れないよう差し替える
  vi.spyOn(console, "error").mockImplementation(() => {});
  // モジュール内のフォールバック保持をテスト間で持ち越さない
  clearSessionToken();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loadOrCreateSessionToken", () => {
  it("初回は空でないトークンを生成すること", () => {
    expect(loadOrCreateSessionToken()).not.toBe("");
  });

  it("初回に生成したトークンを sessionStorage へ保存すること", () => {
    const token = loadOrCreateSessionToken();

    expect(readStoredToken()).toBe(token);
  });

  it("2回目の取得では同じトークンを返すこと", () => {
    const first = loadOrCreateSessionToken();

    expect(loadOrCreateSessionToken()).toBe(first);
  });

  it("保存済みのトークンがあればそれを返すこと", () => {
    globalThis.sessionStorage.setItem("ppw:session-token", "stored-token");

    expect(loadOrCreateSessionToken()).toBe("stored-token");
  });

  it("保存値が空文字の場合は新しいトークンを生成すること", () => {
    globalThis.sessionStorage.setItem("ppw:session-token", "");

    expect(loadOrCreateSessionToken()).not.toBe("");
  });

  it("sessionStorage の参照が例外を投げても例外を伝播させないこと", () => {
    vi.stubGlobal("sessionStorage", createThrowingStorage());

    expect(() => loadOrCreateSessionToken()).not.toThrow();
  });

  it("sessionStorage が例外を投げる環境でも2回目に同じトークンを返すこと", () => {
    vi.stubGlobal("sessionStorage", createThrowingStorage());
    const first = loadOrCreateSessionToken();

    expect(loadOrCreateSessionToken()).toBe(first);
  });

  it("sessionStorage が存在しない環境でも例外を投げないこと", () => {
    vi.stubGlobal("sessionStorage", undefined);

    expect(() => loadOrCreateSessionToken()).not.toThrow();
  });

  it("sessionStorage が存在しない環境でも空でないトークンを返すこと", () => {
    vi.stubGlobal("sessionStorage", undefined);

    expect(loadOrCreateSessionToken()).not.toBe("");
  });

  it("sessionStorage が存在しない環境でも2回目に同じトークンを返すこと", () => {
    vi.stubGlobal("sessionStorage", undefined);
    const first = loadOrCreateSessionToken();

    expect(loadOrCreateSessionToken()).toBe(first);
  });

  it("randomUUID が使える環境ではその値をトークンにすること", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "00000000-0000-4000-8000-000000000000",
    });

    expect(loadOrCreateSessionToken()).toBe(
      "00000000-0000-4000-8000-000000000000",
    );
  });

  it("randomUUID が無い環境でも空でないトークンを生成すること", () => {
    vi.stubGlobal("crypto", {});

    expect(loadOrCreateSessionToken()).not.toBe("");
  });

  it("crypto 自体が無い環境でも空でないトークンを生成すること", () => {
    vi.stubGlobal("crypto", undefined);

    expect(loadOrCreateSessionToken()).not.toBe("");
  });

  it("randomUUID が無い環境でもトークンを保存して再利用すること", () => {
    vi.stubGlobal("crypto", {});
    const first = loadOrCreateSessionToken();

    expect(loadOrCreateSessionToken()).toBe(first);
  });
});

describe("clearSessionToken", () => {
  it("保存済みのトークンを sessionStorage から消すこと", () => {
    loadOrCreateSessionToken();

    clearSessionToken();

    expect(readStoredToken()).toBeNull();
  });

  it("破棄後の取得では新しいトークンを返すこと", () => {
    const first = loadOrCreateSessionToken();

    clearSessionToken();

    expect(loadOrCreateSessionToken()).not.toBe(first);
  });

  it("sessionStorage が例外を投げても例外を伝播させないこと", () => {
    vi.stubGlobal("sessionStorage", createThrowingStorage());

    expect(() => clearSessionToken()).not.toThrow();
  });

  it("sessionStorage が存在しない環境でも例外を投げないこと", () => {
    vi.stubGlobal("sessionStorage", undefined);

    expect(() => clearSessionToken()).not.toThrow();
  });

  it("未保存の状態で破棄しても例外を投げないこと", () => {
    expect(() => clearSessionToken()).not.toThrow();
  });
});

describe("renewSessionToken", () => {
  it("発行前のトークンとは異なる値を返すこと", () => {
    const first = loadOrCreateSessionToken();

    expect(renewSessionToken()).not.toBe(first);
  });

  it("発行したトークンを sessionStorage へ保存すること", () => {
    const renewed = renewSessionToken();

    expect(readStoredToken()).toBe(renewed);
  });

  it("発行後の取得では新しいトークンを返すこと", () => {
    loadOrCreateSessionToken();

    const renewed = renewSessionToken();

    expect(loadOrCreateSessionToken()).toBe(renewed);
  });

  it("sessionStorage が例外を投げても例外を伝播させないこと", () => {
    vi.stubGlobal("sessionStorage", createThrowingStorage());

    expect(() => renewSessionToken()).not.toThrow();
  });

  it("sessionStorage が例外を投げる環境でも発行値を保持すること", () => {
    vi.stubGlobal("sessionStorage", createThrowingStorage());

    const renewed = renewSessionToken();

    expect(loadOrCreateSessionToken()).toBe(renewed);
  });
});
