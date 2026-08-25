/**
 * sceneControllerReducer
 * ゲーム画面コントローラの状態遷移ロジックを管理する
 * HUD同期・ミニマップ同期・初期化状態の更新を一箇所で扱う
 */
import { config } from "@client/config";
import type {
  GameHudState,
  MiniMapState,
} from "@client/scenes/game/GameManager";
import {
  buildStartCountdownText,
  formatRemainingTime,
  getInitialTimeDisplay,
} from "@client/scenes/game/input/presentation/GameUiPresenter";

/** チーム塗り率の初期値 */
export const DEFAULT_TEAM_PAINT_RATES = new Array<number>(
  config.GAME_CONFIG.TEAM_COUNT,
).fill(0);

/** ミニマップ表示用のチームID配列を未塗り状態で生成する */
export const createDefaultMiniMapTeamIds = (): number[] => {
  return new Array<number>(
    config.GAME_CONFIG.GRID_COLS * config.GAME_CONFIG.GRID_ROWS,
  ).fill(-1);
};

/** ゲームシーン初期化の進行状態 */
export const GameSceneInitStatus = {
  PENDING: "pending",
  INITIALIZED: "initialized",
  FAILED: "failed",
} as const;

/** ゲームシーン初期化の進行状態の型 */
export type GameSceneInitStatusType =
  (typeof GameSceneInitStatus)[keyof typeof GameSceneInitStatus];

/** ゲーム画面コントローラが保持する状態 */
export type SceneControllerState = {
  timeLeft: string;
  startCountdownText: string | null;
  isInputEnabled: boolean;
  isBombEnabled: boolean;
  teamPaintRates: number[];
  miniMapTeamIds: number[];
  localBombHitCount: number;
  localPlayerPosition: { x: number; y: number } | null;
  isFeverTime: boolean;
  initStatus: GameSceneInitStatusType;
};

/** ゲーム画面コントローラの状態更新アクション */
export type SceneControllerAction =
  | { type: "syncHud"; payload: GameHudState }
  | { type: "syncMiniMap"; payload: MiniMapState }
  | { type: "initSucceeded" }
  | { type: "initFailed" }
  | { type: "reset" };

/** ゲーム画面コントローラの初期状態を生成する */
export const createInitialSceneControllerState = (): SceneControllerState => {
  return {
    timeLeft: getInitialTimeDisplay(),
    startCountdownText: null,
    isInputEnabled: false,
    isBombEnabled: false,
    teamPaintRates: DEFAULT_TEAM_PAINT_RATES,
    miniMapTeamIds: createDefaultMiniMapTeamIds(),
    localBombHitCount: 0,
    localPlayerPosition: null,
    isFeverTime: false,
    initStatus: GameSceneInitStatus.PENDING,
  };
};

/** ゲーム画面コントローラの状態をアクションに応じて更新する */
export const sceneControllerReducer = (
  state: SceneControllerState,
  action: SceneControllerAction,
): SceneControllerState => {
  switch (action.type) {
    case "syncHud": {
      const hud = action.payload;
      return {
        ...state,
        timeLeft: formatRemainingTime(hud.remainingTimeSec),
        startCountdownText: buildStartCountdownText(hud.startCountdownSec),
        isInputEnabled: hud.isInputEnabled,
        isBombEnabled: hud.isBombEnabled,
        teamPaintRates: hud.teamPaintRates,
        localBombHitCount: hud.localBombHitCount,
        isFeverTime: hud.isFeverTime,
      };
    }
    case "syncMiniMap": {
      const miniMap = action.payload;
      return {
        ...state,
        miniMapTeamIds: miniMap.teamIds,
        localPlayerPosition: miniMap.localPlayerPosition,
      };
    }
    case "initSucceeded": {
      return {
        ...state,
        initStatus: GameSceneInitStatus.INITIALIZED,
      };
    }
    case "initFailed": {
      return {
        ...state,
        initStatus: GameSceneInitStatus.FAILED,
      };
    }
    case "reset": {
      return createInitialSceneControllerState();
    }
    default: {
      return state;
    }
  }
};
