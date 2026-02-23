/**
 * GameScene
 * メインゲーム画面の表示とライフサイクルを管理する
 * GameManagerの初期化と入力配線を行う
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { GameInputManager } from "./GameInputManager";
import { GameManager } from "./GameManager";
import { GameView } from "./GameView";
import { config } from "@repo/shared";

/** GameScene の入力プロパティ */
interface GameSceneProps {
  myId: string | null;
}

/**
 * メインゲーム画面コンポーネント
 * UIの描画と GameManager への入力伝達のみを担当する
 */
export function GameScene({ myId }: GameSceneProps) {
  const pixiContainerRef = useRef<HTMLDivElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const inputManagerRef = useRef<GameInputManager | null>(null);

  // gameConfig から初期表示時間文字列を生成する関数
  const getInitialTimeDisplay = () => {
    const totalSec = config.GAME_CONFIG.GAME_DURATION_SEC;
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 初期値に関数を使用
  const [timeLeft, setTimeLeft] = useState(getInitialTimeDisplay());

  useEffect(() => {
    if (!pixiContainerRef.current || !myId) return;

    // GameManager のインスタンス化と初期化
    const manager = new GameManager(pixiContainerRef.current, myId);
    manager.init();
    
    // 参照を保持（入力を渡すため）
    gameManagerRef.current = manager;
    inputManagerRef.current = new GameInputManager(manager);

    // 描画用のタイマーループ (100msごとに更新して滑らかにする)
    const timerInterval = setInterval(() => {
      const remaining = manager.getRemainingTime();
      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);
      // 2:59 の形式にフォーマット
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 100);

    // コンポーネント破棄時のクリーンアップ
    return () => {
      manager.destroy();
      inputManagerRef.current = null;
      clearInterval(timerInterval); // クリーンアップ
    };
  }, [myId]);

  const handleInput = useCallback((x: number, y: number) => {
    inputManagerRef.current?.handleJoystickInput(x, y);
  }, []);

  return (
    <GameView
      timeLeft={timeLeft}
      pixiContainerRef={pixiContainerRef}
      onJoystickInput={handleInput}
    />
  );
}