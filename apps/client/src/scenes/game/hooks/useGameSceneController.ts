/**
 * useGameSceneController
 * ゲーム画面の状態管理と GameManager 連携を担うフック
 * Pixi描画領域，残り時間表示，入力橋渡し，初期化状態の通知を提供する
 */
import { useCallback, useEffect, useReducer, useRef } from "react";
import { GameManager } from "@client/scenes/game/GameManager";
import {
  GameSceneInitResultStatus,
  runGameSceneInit,
} from "@client/scenes/game/application/runtime/runGameSceneInit";
import {
  createInitialSceneControllerState,
  sceneControllerReducer,
} from "./application/sceneControllerReducer";

/** ゲーム画面の状態と入力ハンドラを提供するフック */
export const useGameSceneController = (myId: string | null) => {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const [state, dispatch] = useReducer(
    sceneControllerReducer,
    createInitialSceneControllerState(),
  );

  useEffect(() => {
    if (!pixiContainerRef.current || !myId) return;

    const manager = new GameManager(pixiContainerRef.current, myId);
    gameManagerRef.current = manager;

    // クリーンアップ後や再入で結果が届いた場合に state を更新しないためのフラグ
    let isDisposed = false;

    // runGameSceneInit は失敗も結果値で返し reject しないため，void で受けて結果のみ処理する
    void runGameSceneInit({
      init: () => manager.init(),
      isDisposed: () => isDisposed,
    }).then((result) => {
      switch (result.status) {
        case GameSceneInitResultStatus.INITIALIZED: {
          dispatch({ type: "initSucceeded" });
          return;
        }
        case GameSceneInitResultStatus.FAILED: {
          console.error(
            "[useGameSceneController] ゲームシーンの初期化に失敗した",
            result.error,
          );
          dispatch({ type: "initFailed" });
          return;
        }
        case GameSceneInitResultStatus.ABORTED: {
          // 破棄済みのため state を更新しない（アンマウント済み・再入時の遅延結果）
          return;
        }
      }
    });

    const unsubscribeHud = manager.subscribeHudState((hudState) => {
      dispatch({ type: "syncHud", payload: hudState });
    });
    const unsubscribeMiniMap = manager.subscribeMiniMapState((miniMapState) => {
      dispatch({ type: "syncMiniMap", payload: miniMapState });
    });

    return () => {
      isDisposed = true;
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
    isBombEnabled: state.isBombEnabled,
    teamPaintRates: state.teamPaintRates,
    miniMapTeamIds: state.miniMapTeamIds,
    localBombHitCount: state.localBombHitCount,
    localPlayerPosition: state.localPlayerPosition,
    isFeverTime: state.isFeverTime,
    initStatus: state.initStatus,
    handleInput,
    handlePlaceBomb,
  };
};
