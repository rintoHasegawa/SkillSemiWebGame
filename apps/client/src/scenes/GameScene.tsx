import { useEffect, useRef, useState } from "react";
import { VirtualJoystick } from "../input/VirtualJoystick";
import { GameManager } from "../managers/GameManager";
import { config } from "@repo/shared";

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
    
    // 参照を保持（ジョイスティック入力を渡すため）
    gameManagerRef.current = manager;

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
      clearInterval(timerInterval); // クリーンアップ
    };
  }, [myId]);

  return (
    <div style={{
      width: "100vw", height: "100vh", overflow: "hidden", position: "relative", backgroundColor: "#000",
      userSelect: "none", // 画面全体のテキスト選択を無効化
      WebkitUserSelect: "none" // Safari対策
    }}>
      {/* タイマーUIの表示 */}
      <div style={{
        position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)",
        zIndex: 10, color: "white", fontSize: "32px", fontWeight: "bold",
        textShadow: "2px 2px 4px rgba(0,0,0,0.5)", fontFamily: "monospace",
        userSelect: "none", // 画面全体のテキスト選択を無効化
        WebkitUserSelect: "none" // Safari対策
      }}>
        {timeLeft}
      </div>
      
      {/* PixiJS Canvas 配置領域 */}
      <div ref={pixiContainerRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }} />
      
      {/* UI 配置領域 */}
      <div style={{ position: "absolute", zIndex: 20, width: "100%", height: "100%" }}>
        <VirtualJoystick 
          onMove={(x, y) => { 
            // ジョイスティックの入力を毎フレーム Manager に渡す
            gameManagerRef.current?.setJoystickInput(x, y); 
          }} 
        />
      </div>
    </div>
  );
}