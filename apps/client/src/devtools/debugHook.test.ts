/**
 * debugHook.test
 * 自動動作確認向けデバッグフック（状態の読み取り専用公開）の振る舞いを検証するテスト
 * - 供給元の登録・解除（古い解除関数が後から登録した供給元を消さない）
 * - スナップショットは呼び出し時点の複製で，呼び出し側の改変が内部へ波及しない
 * - 公開名は上書き不可・列挙不可で，読み取り専用 API のみを公開する
 */
import { describe, expect, it } from "vitest";

import {
  DEBUG_HOOK_GLOBAL_KEY,
  DEBUG_HOOK_SCHEMA_VERSION,
  createDebugStateRegistry,
  installDebugHook,
  type DebugAppState,
  type DebugGameState,
  type DebugHookApi,
} from "./debugHook";

/** テスト用のアプリフロー状態を生成する */
const createAppState = (overrides: Partial<DebugAppState> = {}): DebugAppState => {
  return {
    scenePhase: "title",
    myId: null,
    playerName: "verify-player",
    isJoining: false,
    isReconnecting: false,
    joinErrorMessage: null,
    connectionNoticeMessage: null,
    room: null,
    gameResult: null,
    ...overrides,
  } as DebugAppState;
};

/** テスト用のゲームシーン状態を生成する */
const createGameState = (
  overrides: Partial<DebugGameState> = {},
): DebugGameState => {
  return {
    remainingTimeSec: 30,
    startCountdownSec: 0,
    isInputEnabled: true,
    isBombEnabled: true,
    isFeverTime: true,
    teamPaintRates: [10, 20, 30, 40],
    localBombHitCount: 0,
    localPlayer: { id: "p1", teamId: 0, x: 1, y: 2 },
    playerCount: 4,
    gameDurationSec: 30,
    gridCols: 36,
    gridRows: 36,
    ...overrides,
  };
};

/** 公開先オブジェクトから API を取り出す */
const readHook = (target: object): DebugHookApi => {
  return (target as Record<string, DebugHookApi>)[DEBUG_HOOK_GLOBAL_KEY];
};

describe("DEBUG_HOOK_GLOBAL_KEY", () => {
  it("公開名が__PIXEL_PAINT_WAR_DEBUG__であること", () => {
    expect(DEBUG_HOOK_GLOBAL_KEY).toBe("__PIXEL_PAINT_WAR_DEBUG__");
  });
});

describe("createDebugStateRegistry", () => {
  describe("getSnapshot", () => {
    it("供給元が未登録の場合はappとgameがnullであること", () => {
      const registry = createDebugStateRegistry();

      const snapshot = registry.getSnapshot();

      expect(snapshot.app).toBeNull();
      expect(snapshot.game).toBeNull();
    });

    it("スナップショット形式の版を含むこと", () => {
      const registry = createDebugStateRegistry();

      expect(registry.getSnapshot().schemaVersion).toBe(DEBUG_HOOK_SCHEMA_VERSION);
    });

    it("注入した時刻関数の値を取得時刻として含むこと", () => {
      const registry = createDebugStateRegistry({ nowMs: () => 12_345 });

      expect(registry.getSnapshot().capturedAtMs).toBe(12_345);
    });

    it("呼び出しのたびに時刻関数を評価すること", () => {
      let now = 100;
      const registry = createDebugStateRegistry({ nowMs: () => now });
      registry.getSnapshot();
      now = 200;

      expect(registry.getSnapshot().capturedAtMs).toBe(200);
    });

    it("登録したアプリフローの供給元の値を返すこと", () => {
      const registry = createDebugStateRegistry();
      registry.setAppSource(() => createAppState({ scenePhase: "lobby" } as Partial<DebugAppState>));

      expect(registry.getSnapshot().app?.scenePhase).toBe("lobby");
    });

    it("登録したゲームシーンの供給元の値を返すこと", () => {
      const registry = createDebugStateRegistry();
      registry.setGameSource(() => createGameState({ gameDurationSec: 45 }));

      expect(registry.getSnapshot().game?.gameDurationSec).toBe(45);
    });

    it("呼び出し時点の供給元の値を返すこと", () => {
      const registry = createDebugStateRegistry();
      let remainingTimeSec = 30;
      registry.setGameSource(() => createGameState({ remainingTimeSec }));
      registry.getSnapshot();
      remainingTimeSec = 12;

      expect(registry.getSnapshot().game?.remainingTimeSec).toBe(12);
    });
  });

  describe("返り値の複製", () => {
    it("返したスナップショットを改変しても供給元の状態に波及しないこと", () => {
      const registry = createDebugStateRegistry();
      const gameState = createGameState();
      registry.setGameSource(() => gameState);

      const snapshot = registry.getSnapshot();
      snapshot.game?.teamPaintRates.push(99);
      if (snapshot.game?.localPlayer) {
        snapshot.game.localPlayer.x = 999;
      }

      expect(gameState.teamPaintRates).toEqual([10, 20, 30, 40]);
      expect(gameState.localPlayer?.x).toBe(1);
    });

    it("供給元が返したオブジェクトと同一参照を返さないこと", () => {
      const registry = createDebugStateRegistry();
      const appState = createAppState();
      registry.setAppSource(() => appState);

      expect(registry.getSnapshot().app).not.toBe(appState);
    });

    it("複製後も値は供給元と等しいこと", () => {
      const registry = createDebugStateRegistry();
      const gameState = createGameState();
      registry.setGameSource(() => gameState);

      expect(registry.getSnapshot().game).toEqual(gameState);
    });

    it("呼び出しごとに別のスナップショットを返すこと", () => {
      const registry = createDebugStateRegistry();
      registry.setGameSource(() => createGameState());

      expect(registry.getSnapshot().game).not.toBe(registry.getSnapshot().game);
    });
  });

  describe("登録解除", () => {
    it("アプリフローの登録解除後はappがnullになること", () => {
      const registry = createDebugStateRegistry();
      const unregister = registry.setAppSource(() => createAppState());

      unregister();

      expect(registry.getSnapshot().app).toBeNull();
    });

    it("ゲームシーンの登録解除後はgameがnullになること", () => {
      const registry = createDebugStateRegistry();
      const unregister = registry.setGameSource(() => createGameState());

      unregister();

      expect(registry.getSnapshot().game).toBeNull();
    });

    it("古いゲームシーンの登録解除関数を呼んでも後から登録した供給元を消さないこと", () => {
      const registry = createDebugStateRegistry();
      const unregisterOld = registry.setGameSource(() =>
        createGameState({ gameDurationSec: 180 }),
      );
      registry.setGameSource(() => createGameState({ gameDurationSec: 30 }));

      unregisterOld();

      expect(registry.getSnapshot().game?.gameDurationSec).toBe(30);
    });

    it("古いアプリフローの登録解除関数を呼んでも後から登録した供給元を消さないこと", () => {
      const registry = createDebugStateRegistry();
      const unregisterOld = registry.setAppSource(() =>
        createAppState({ playerName: "old" }),
      );
      registry.setAppSource(() => createAppState({ playerName: "new" }));

      unregisterOld();

      expect(registry.getSnapshot().app?.playerName).toBe("new");
    });

    it("同じ解除関数を2回呼んでも後から登録した供給元を消さないこと", () => {
      const registry = createDebugStateRegistry();
      const unregister = registry.setGameSource(() => createGameState());
      unregister();
      registry.setGameSource(() => createGameState({ playerCount: 8 }));

      unregister();

      expect(registry.getSnapshot().game?.playerCount).toBe(8);
    });

    it("ゲームシーンの登録解除がアプリフローの供給元に影響しないこと", () => {
      const registry = createDebugStateRegistry();
      registry.setAppSource(() => createAppState());
      const unregisterGame = registry.setGameSource(() => createGameState());

      unregisterGame();

      expect(registry.getSnapshot().app).not.toBeNull();
    });

    it("レジストリごとに供給元が独立していること", () => {
      const registryA = createDebugStateRegistry();
      const registryB = createDebugStateRegistry();
      registryA.setGameSource(() => createGameState());

      expect(registryB.getSnapshot().game).toBeNull();
    });
  });
});

describe("installDebugHook", () => {
  it("公開先オブジェクトの公開名でAPIを参照できること", () => {
    const target = {};
    const api = installDebugHook(target, createDebugStateRegistry());

    expect(readHook(target)).toBe(api);
  });

  it("公開したAPIからレジストリのスナップショットを取得できること", () => {
    const target = {};
    const registry = createDebugStateRegistry();
    registry.setGameSource(() => createGameState({ gameDurationSec: 45 }));
    installDebugHook(target, registry);

    expect(readHook(target).getSnapshot().game?.gameDurationSec).toBe(45);
  });

  it("公開したAPIがスナップショット形式の版を持つこと", () => {
    const target = {};
    installDebugHook(target, createDebugStateRegistry());

    expect(readHook(target).schemaVersion).toBe(DEBUG_HOOK_SCHEMA_VERSION);
  });

  it("公開後に登録した供給元もAPIから取得できること", () => {
    const target = {};
    const registry = createDebugStateRegistry();
    installDebugHook(target, registry);

    registry.setAppSource(() => createAppState({ playerName: "late" }));

    expect(readHook(target).getSnapshot().app?.playerName).toBe("late");
  });

  it("公開名を代入で上書きできないこと", () => {
    const target: Record<string, unknown> = {};
    const api = installDebugHook(target, createDebugStateRegistry());

    // ESM（strict mode）では読み取り専用プロパティへの代入は TypeError になる
    expect(() => {
      target[DEBUG_HOOK_GLOBAL_KEY] = { getSnapshot: () => null };
    }).toThrow(TypeError);
    expect(target[DEBUG_HOOK_GLOBAL_KEY]).toBe(api);
  });

  it("公開名が列挙されないこと", () => {
    const target = {};
    installDebugHook(target, createDebugStateRegistry());

    expect(Object.keys(target)).not.toContain(DEBUG_HOOK_GLOBAL_KEY);
  });

  it("公開名がJSON化に含まれないこと", () => {
    const target = {};
    installDebugHook(target, createDebugStateRegistry());

    expect(JSON.stringify(target)).toBe("{}");
  });

  it("公開したAPIのメソッドを差し替えられないこと", () => {
    const target = {};
    installDebugHook(target, createDebugStateRegistry());
    const api = readHook(target) as { getSnapshot: unknown };

    expect(() => {
      api.getSnapshot = () => null;
    }).toThrow(TypeError);
  });

  it("公開したAPIに新しいプロパティを追加できないこと", () => {
    const target = {};
    installDebugHook(target, createDebugStateRegistry());

    expect(Object.isFrozen(readHook(target))).toBe(true);
  });

  it("公開したAPIが読み取り用のメンバーのみを持つこと", () => {
    const target = {};
    installDebugHook(target, createDebugStateRegistry());

    expect(Object.keys(readHook(target)).sort()).toEqual([
      "getSnapshot",
      "schemaVersion",
    ]);
  });

  it("公開したAPIから供給元の登録関数に到達できないこと", () => {
    const target = {};
    installDebugHook(target, createDebugStateRegistry());

    expect(readHook(target)).not.toHaveProperty("setAppSource");
    expect(readHook(target)).not.toHaveProperty("setGameSource");
  });

  it("同じ公開先へ再公開（HMR 等）すると新しいAPIへ差し替わること", () => {
    const target = {};
    installDebugHook(target, createDebugStateRegistry());
    const registry = createDebugStateRegistry();
    registry.setAppSource(() => createAppState({ playerName: "reloaded" }));

    const api = installDebugHook(target, registry);

    expect(readHook(target)).toBe(api);
    expect(readHook(target).getSnapshot().app?.playerName).toBe("reloaded");
  });
});
