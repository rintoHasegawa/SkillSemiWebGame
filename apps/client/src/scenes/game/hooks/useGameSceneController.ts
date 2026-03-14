/**
 * useGameSceneController
 * ゲーム画面の状態管理と GameManager 連携を担うフック
 * Pixi描画領域，残り時間表示，入力橋渡しを提供する
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { GameManager } from "@client/scenes/game/GameManager";
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

/** ゲーム画面の状態と入力ハンドラを提供するフック */
export const useGameSceneController = (myId: string | null) => {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const [timeLeft, setTimeLeft] = useState(getInitialTimeDisplay());
  const [startCountdownText, setStartCountdownText] = useState<string | null>(
    null,
  );
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [teamPaintRates, setTeamPaintRates] = useState<number[]>(
    DEFAULT_TEAM_PAINT_RATES,
  );
  const [miniMapTeamIds, setMiniMapTeamIds] = useState<number[]>(
    DEFAULT_MINIMAP_TEAM_IDS,
  );
  const [localBombHitCount, setLocalBombHitCount] = useState(0);
  const [localPlayerPosition, setLocalPlayerPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!pixiContainerRef.current || !myId) return;

    const manager = new GameManager(pixiContainerRef.current, myId);
    manager.init();

    gameManagerRef.current = manager;
    const unsubscribeUiState = manager.subscribeUiState((state) => {
      const nextDisplay = formatRemainingTime(state.remainingTimeSec);
      setTimeLeft((prev) => (prev === nextDisplay ? prev : nextDisplay));

      const nextCountdown = buildStartCountdownText(state.startCountdownSec);
      setStartCountdownText((prev) =>
        prev === nextCountdown ? prev : nextCountdown,
      );

      const nextInputEnabled = state.isInputEnabled;
      setIsInputEnabled((prev) =>
        prev === nextInputEnabled ? prev : nextInputEnabled,
      );

      setTeamPaintRates(state.teamPaintRates);
      setMiniMapTeamIds(state.miniMapTeamIds);
      setLocalBombHitCount(state.localBombHitCount);
      setLocalPlayerPosition(state.localPlayerPosition);
    });

    return () => {
      unsubscribeUiState();
      manager.destroy();
      gameManagerRef.current = null;
      setStartCountdownText(null);
      setIsInputEnabled(false);
      setTeamPaintRates(DEFAULT_TEAM_PAINT_RATES);
      setMiniMapTeamIds(DEFAULT_MINIMAP_TEAM_IDS);
      setLocalBombHitCount(0);
      setLocalPlayerPosition(null);
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
    timeLeft,
    startCountdownText,
    isInputEnabled,
    teamPaintRates,
    miniMapTeamIds,
    localBombHitCount,
    localPlayerPosition,
    handleInput,
    handlePlaceBomb,
  };
};
