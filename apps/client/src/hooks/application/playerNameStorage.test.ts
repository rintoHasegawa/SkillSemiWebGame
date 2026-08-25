/**
 * playerNameStorage.test
 * プレイヤー名の永続化仕様を検証する
 * タイトルでのリロード後も名前が保持されること（Issue #368 受け入れ条件），
 * および入力制約（SPEC_02）に沿った切り詰めと保存領域異常時のフォールバックを対象とする
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { domain } from "@repo/shared";

import {
  loadPlayerName,
  savePlayerName,
  PLAYER_NAME_STORAGE_KEY,
} from "./playerNameStorage";

/** メモリ上で動作する localStorage 代替を生成する */
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

/** 読み書きの双方で例外を投げる localStorage 代替を生成する */
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
  vi.stubGlobal("localStorage", createMemoryStorage());
  // 保存失敗時のログ出力でテスト出力が汚れないよう差し替える
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loadPlayerName", () => {
  it("未保存のときは空文字を返すこと", () => {
    expect(loadPlayerName()).toBe("");
  });

  it("保存した名前をそのまま復元すること", () => {
    savePlayerName("たろう");

    expect(loadPlayerName()).toBe("たろう");
  });

  it("上限を超える値が保存されていた場合は上限まで切り詰めて返すこと", () => {
    localStorage.setItem(
      PLAYER_NAME_STORAGE_KEY,
      "a".repeat(domain.room.PLAYER_NAME_MAX_LENGTH + 10),
    );

    expect(loadPlayerName()).toHaveLength(domain.room.PLAYER_NAME_MAX_LENGTH);
  });

  it("上限ちょうどの値はそのまま復元すること", () => {
    const maxName = "a".repeat(domain.room.PLAYER_NAME_MAX_LENGTH);
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, maxName);

    expect(loadPlayerName()).toBe(maxName);
  });

  it("空文字が保存されていた場合は空文字を返すこと", () => {
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, "");

    expect(loadPlayerName()).toBe("");
  });

  it("localStorage の参照が例外を投げる場合は空文字を返すこと", () => {
    vi.stubGlobal("localStorage", createThrowingStorage());

    expect(loadPlayerName()).toBe("");
  });

  it("localStorage が存在しない環境では空文字を返すこと", () => {
    vi.stubGlobal("localStorage", undefined);

    expect(loadPlayerName()).toBe("");
  });
});

describe("savePlayerName", () => {
  it("保存した名前を再読み込みで取り出せること", () => {
    savePlayerName("はなこ");

    expect(loadPlayerName()).toBe("はなこ");
  });

  it("後から保存した名前で上書きされること", () => {
    savePlayerName("たろう");
    savePlayerName("じろう");

    expect(loadPlayerName()).toBe("じろう");
  });

  it("空文字を保存した場合は空文字が復元されること", () => {
    savePlayerName("たろう");
    savePlayerName("");

    expect(loadPlayerName()).toBe("");
  });

  it("上限を超える名前は上限まで切り詰めて保存すること", () => {
    savePlayerName("a".repeat(domain.room.PLAYER_NAME_MAX_LENGTH + 5));

    expect(localStorage.getItem(PLAYER_NAME_STORAGE_KEY)).toHaveLength(
      domain.room.PLAYER_NAME_MAX_LENGTH,
    );
  });

  it("上限ちょうどの名前はそのまま保存すること", () => {
    const maxName = "a".repeat(domain.room.PLAYER_NAME_MAX_LENGTH);

    savePlayerName(maxName);

    expect(localStorage.getItem(PLAYER_NAME_STORAGE_KEY)).toBe(maxName);
  });

  it("localStorage の書き込みが例外を投げても例外を伝播させないこと", () => {
    vi.stubGlobal("localStorage", createThrowingStorage());

    expect(() => savePlayerName("たろう")).not.toThrow();
  });

  it("localStorage が存在しない環境でも例外を投げないこと", () => {
    vi.stubGlobal("localStorage", undefined);

    expect(() => savePlayerName("たろう")).not.toThrow();
  });
});
