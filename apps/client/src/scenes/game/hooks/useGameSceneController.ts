/**
 * useGameSceneController
 * ゲーム画面の状態管理と GameManager 連携を担うフック
 * Pixi描画領域，残り時間表示，入力橋渡しを提供する
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "@client/config";
import { GameManager } from "@client/scenes/game/GameManager";

const formatRemainingTime = (remaining: number) => {
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getInitialTimeDisplay = () =>
  formatRemainingTime(config.GAME_CONFIG.GAME_DURATION_SEC);

/** ゲーム画面の状態と入力ハンドラを提供するフック */
export const useGameSceneController = (myId: string | null) => {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const [timeLeft, setTimeLeft] = useState(getInitialTimeDisplay());
  const [startCountdownText, setStartCountdownText] = useState<string | null>(
    null,
  );
  const [isInputEnabled, setIsInputEnabled] = useState(false);

  useEffect(() => {
    if (!pixiContainerRef.current || !myId) return;

    const manager = new GameManager(pixiContainerRef.current, myId);
    manager.init();

    gameManagerRef.current = manager;
    const unsubscribeUiState = manager.subscribeUiState((state) => {
      const nextDisplay = formatRemainingTime(state.remainingTimeSec);
      setTimeLeft((prev) => (prev === nextDisplay ? prev : nextDisplay));

      const remainingSec = state.startCountdownSec;
      const nextCountdown = remainingSec > 0 ? String(remainingSec) : null;
      setStartCountdownText((prev) =>
        prev === nextCountdown ? prev : nextCountdown,
      );

      const nextInputEnabled = state.isInputEnabled;
      setIsInputEnabled((prev) =>
        prev === nextInputEnabled ? prev : nextInputEnabled,
      );
    });

    return () => {
      unsubscribeUiState();
      manager.destroy();
      gameManagerRef.current = null;
      setStartCountdownText(null);
      setIsInputEnabled(false);
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
    handleInput,
    handlePlaceBomb,
  };
};
