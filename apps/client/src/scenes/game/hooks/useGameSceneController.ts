import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "@repo/shared";
import { GameInputManager } from "../GameInputManager";
import { GameManager } from "../GameManager";

const formatRemainingTime = (remaining: number) => {
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getInitialTimeDisplay = () => formatRemainingTime(config.GAME_CONFIG.GAME_DURATION_SEC);

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
    inputManagerRef.current = new GameInputManager((x, y) => {
      manager.setJoystickInput(x, y);
    });

    const timerInterval = setInterval(() => {
      setTimeLeft(formatRemainingTime(manager.getRemainingTime()));
    }, 100);

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

  return {
    pixiContainerRef,
    timeLeft,
    handleInput,
  };
};
