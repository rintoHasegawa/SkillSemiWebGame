/**
 * useGameSceneController
 * ゲーム画面の状態管理と GameManager 連携を担うフック
 * Pixi描画領域，残り時間表示，入力橋渡しを提供する
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "@client/config";
import { GameInputManager } from "@client/scenes/game/GameInputManager";
import { GameManager } from "@client/scenes/game/GameManager";

const formatRemainingTime = (remaining: number) => {
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getInitialTimeDisplay = () => formatRemainingTime(config.GAME_CONFIG.GAME_DURATION_SEC);

/** ゲーム画面の状態と入力ハンドラを提供するフック */
export const useGameSceneController = (myId: string | null) => {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const inputManagerRef = useRef<GameInputManager | null>(null);
  const [timeLeft, setTimeLeft] = useState(getInitialTimeDisplay());

  useEffect(() => {
    if (!pixiContainerRef.current || !myId) return;

    const manager = new GameManager(pixiContainerRef.current, myId);
    manager.init();

    gameManagerRef.current = manager;
    inputManagerRef.current = new GameInputManager(
      (x, y) => {
        manager.setJoystickInput(x, y);
      },
      () => {
        manager.placeBomb();
      }
    );

    const timerInterval = setInterval(() => {
      const nextDisplay = formatRemainingTime(manager.getRemainingTime());
      setTimeLeft((prev) => (prev === nextDisplay ? prev : nextDisplay));
    }, config.GAME_CONFIG.TIMER_DISPLAY_UPDATE_MS);

    return () => {
      manager.destroy();
      gameManagerRef.current = null;
      inputManagerRef.current = null;
      clearInterval(timerInterval);
    };
  }, [myId]);

  const handleInput = useCallback((x: number, y: number) => {
    inputManagerRef.current?.handleJoystickInput(x, y);
  }, []);

  const handlePlaceBomb = useCallback(() => {
    inputManagerRef.current?.handlePlaceBomb();
  }, []);

  return {
    pixiContainerRef,
    timeLeft,
    handleInput,
    handlePlaceBomb,
  };
};
