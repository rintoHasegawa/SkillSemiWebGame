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
  const [localBombHitCount, setLocalBombHitCount] = useState(0);

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
      setLocalBombHitCount(state.localBombHitCount);
    });

    return () => {
      unsubscribeUiState();
      manager.destroy();
      gameManagerRef.current = null;
      setStartCountdownText(null);
      setIsInputEnabled(false);
      setTeamPaintRates(DEFAULT_TEAM_PAINT_RATES);
      setLocalBombHitCount(0);
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
    localBombHitCount,
    handleInput,
    handlePlaceBomb,
  };
};
