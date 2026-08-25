/**
 * sceneControllerReducer.test
 * ゲーム画面コントローラの状態遷移を検証する
 * 初期化状態（pending / initialized / failed）の更新範囲を確認する
 */
import { describe, expect, it } from "vitest";

import type {
  GameHudState,
  MiniMapState,
} from "@client/scenes/game/GameManager";

import {
  createInitialSceneControllerState,
  GameSceneInitStatus,
  sceneControllerReducer,
  type SceneControllerState,
} from "./sceneControllerReducer";

const createHudState = (): GameHudState => {
  return {
    remainingTimeSec: 95,
    startCountdownSec: 0,
    isInputEnabled: true,
    teamPaintRates: [0.4, 0.3, 0.2, 0.1],
    localBombHitCount: 2,
    isFeverTime: true,
  };
};

const createMiniMapState = (): MiniMapState => {
  return {
    mapRevision: 3,
    teamIds: [0, 1, -1, 2],
    localPlayerPosition: { x: 12, y: 34 },
  };
};

// 初期化失敗が記録された状態を生成する
const createFailedState = (): SceneControllerState => {
  return sceneControllerReducer(createInitialSceneControllerState(), {
    type: "initFailed",
  });
};

describe("createInitialSceneControllerState", () => {
  it("初期状態の初期化ステータスが pending であること", () => {
    const state = createInitialSceneControllerState();

    expect(state.initStatus).toBe(GameSceneInitStatus.PENDING);
  });
});

describe("sceneControllerReducer", () => {
  it("initFailed で初期化ステータスが failed になること", () => {
    const next = sceneControllerReducer(createInitialSceneControllerState(), {
      type: "initFailed",
    });

    expect(next.initStatus).toBe(GameSceneInitStatus.FAILED);
  });

  it("initFailed が初期化ステータス以外のフィールドを変更しないこと", () => {
    const state = sceneControllerReducer(createInitialSceneControllerState(), {
      type: "syncHud",
      payload: createHudState(),
    });

    const next = sceneControllerReducer(state, { type: "initFailed" });

    expect(next).toEqual({
      ...state,
      initStatus: GameSceneInitStatus.FAILED,
    });
  });

  it("initSucceeded で初期化ステータスが initialized になること", () => {
    const next = sceneControllerReducer(createInitialSceneControllerState(), {
      type: "initSucceeded",
    });

    expect(next.initStatus).toBe(GameSceneInitStatus.INITIALIZED);
  });

  it("reset で初期化ステータスが pending へ戻ること", () => {
    const next = sceneControllerReducer(createFailedState(), { type: "reset" });

    expect(next.initStatus).toBe(GameSceneInitStatus.PENDING);
  });

  it("syncHud が初期化ステータスを変更しないこと", () => {
    const next = sceneControllerReducer(createFailedState(), {
      type: "syncHud",
      payload: createHudState(),
    });

    expect(next.initStatus).toBe(GameSceneInitStatus.FAILED);
  });

  it("syncMiniMap が初期化ステータスを変更しないこと", () => {
    const next = sceneControllerReducer(createFailedState(), {
      type: "syncMiniMap",
      payload: createMiniMapState(),
    });

    expect(next.initStatus).toBe(GameSceneInitStatus.FAILED);
  });
});
