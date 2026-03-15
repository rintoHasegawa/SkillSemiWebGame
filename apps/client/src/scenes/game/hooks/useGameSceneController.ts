/**
 * useGameSceneController
 * ゲーム画面の状態管理と GameManager 連携を担うフック
 * Pixi描画領域，残り時間表示，入力橋渡しを提供する
 */
import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  GameManager,
  type GameHudState,
  type MiniMapState,
} from "@client/scenes/game/GameManager";
import { config } from "@client/config";
import {
  buildStartCountdownText,
  formatRemainingTime,
  getInitialTimeDisplay,
} from "@client/scenes/game/input/presentation/GameUiPresenter";

const DEFAULT_TEAM_PAINT_RATES = new Array<number>(
  config.GAME_CONFIG.TEAM_COUNT,
).fill(0);
const DEFAULT_MINIMAP_TEAM_IDS = new Array<number>(
  config.GAME_CONFIG.GRID_COLS * config.GAME_CONFIG.GRID_ROWS,
).fill(-1);

type SceneControllerState = {
  timeLeft: string;
  startCountdownText: string | null;
  isInputEnabled: boolean;
  teamPaintRates: number[];
  miniMapTeamIds: number[];
  localBombHitCount: number;
  localPlayerPosition: { x: number; y: number } | null;
};

type SceneControllerAction =
  | { type: "syncHud"; payload: GameHudState }
  | { type: "syncMiniMap"; payload: MiniMapState }
  | { type: "reset" };

const INITIAL_SCENE_CONTROLLER_STATE: SceneControllerState = {
  timeLeft: getInitialTimeDisplay(),
  startCountdownText: null,
  isInputEnabled: false,
  teamPaintRates: DEFAULT_TEAM_PAINT_RATES,
  miniMapTeamIds: DEFAULT_MINIMAP_TEAM_IDS,
  localBombHitCount: 0,
  localPlayerPosition: null,
};

const sceneControllerReducer = (
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
        teamPaintRates: hud.teamPaintRates,
        localBombHitCount: hud.localBombHitCount,
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
    case "reset": {
      return INITIAL_SCENE_CONTROLLER_STATE;
    }
    default: {
      return state;
    }
  }
};

/** ゲーム画面の状態と入力ハンドラを提供するフック */
export const useGameSceneController = (myId: string | null) => {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const [state, dispatch] = useReducer(
    sceneControllerReducer,
    INITIAL_SCENE_CONTROLLER_STATE,
  );

  useEffect(() => {
    if (!pixiContainerRef.current || !myId) return;

    const manager = new GameManager(pixiContainerRef.current, myId);
    manager.init();

    gameManagerRef.current = manager;
    const unsubscribeHud = manager.subscribeHudState((hudState) => {
      dispatch({ type: "syncHud", payload: hudState });
    });
    const unsubscribeMiniMap = manager.subscribeMiniMapState((miniMapState) => {
      dispatch({ type: "syncMiniMap", payload: miniMapState });
    });

    return () => {
      unsubscribeHud();
      unsubscribeMiniMap();
      manager.destroy();
      gameManagerRef.current = null;
      dispatch({ type: "reset" });
    };
  }, [myId]);

  const handleInput = useCallback((x: number, y: number) => {
    gameManagerRef.current?.setJoystickInput(x, y);
  }, []);

  const handlePlaceBomb = useCallback((): boolean => {
    return gameManagerRef.current?.placeBomb() !== null;
  }, []);

  return {
    pixiContainerRef,
    timeLeft: state.timeLeft,
    startCountdownText: state.startCountdownText,
    isInputEnabled: state.isInputEnabled,
    teamPaintRates: state.teamPaintRates,
    miniMapTeamIds: state.miniMapTeamIds,
    localBombHitCount: state.localBombHitCount,
    localPlayerPosition: state.localPlayerPosition,
    handleInput,
    handlePlaceBomb,
  };
};
