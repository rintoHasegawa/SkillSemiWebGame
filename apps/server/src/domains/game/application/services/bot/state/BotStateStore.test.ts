/**
 * BotStateStore.test
 * Bot状態ストアの現行挙動を固定する characterization test
 * 未登録時の初期値返却と更新関数の適用条件を検証する
 */
import { describe, expect, it } from "vitest";

import type { BotPlayerId } from "../roster/BotRosterService";
import type { BotState } from "../types/BotTypes";
import { BotStateStore } from "./BotStateStore";

const botPlayerId = "bot:room-1:1" as BotPlayerId;

/** テスト用のBot状態を生成する */
const createState = (overrides: Partial<BotState> = {}): BotState => {
  return {
    targetCol: 0,
    targetRow: 0,
    lastBombPlacedAtMs: 0,
    bombSeq: 0,
    stunUntilMs: 0,
    ...overrides,
  };
};

describe("BotStateStore", () => {
  it("未登録の場合は渡した初期状態を返すこと", () => {
    const store = new BotStateStore();
    const initialState = createState({ targetCol: 3 });

    expect(store.getOrCreate(botPlayerId, initialState)).toBe(initialState);
  });

  it("未登録の場合は初期状態を保存しないこと", () => {
    const store = new BotStateStore();
    store.getOrCreate(botPlayerId, createState({ targetCol: 3 }));

    expect(store.getOrCreate(botPlayerId, createState()).targetCol).toBe(0);
  });

  it("登録済みの場合は保存済み状態を返すこと", () => {
    const store = new BotStateStore();
    const savedState = createState({ targetCol: 5 });
    store.set(botPlayerId, savedState);

    expect(store.getOrCreate(botPlayerId, createState())).toBe(savedState);
  });

  it("未登録のIDに対する更新は無視すること", () => {
    const store = new BotStateStore();

    store.update(botPlayerId, (state) => ({ ...state, targetCol: 9 }));

    expect(store.getOrCreate(botPlayerId, createState()).targetCol).toBe(0);
  });

  it("登録済みのIDに対しては更新関数を適用すること", () => {
    const store = new BotStateStore();
    store.set(botPlayerId, createState());

    store.update(botPlayerId, (state) => ({ ...state, targetCol: 9 }));

    expect(store.getOrCreate(botPlayerId, createState()).targetCol).toBe(9);
  });

  it("クリア後は保存済み状態を保持しないこと", () => {
    const store = new BotStateStore();
    store.set(botPlayerId, createState({ targetCol: 5 }));

    store.clear();

    expect(store.getOrCreate(botPlayerId, createState()).targetCol).toBe(0);
  });
});
