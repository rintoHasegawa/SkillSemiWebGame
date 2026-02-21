import { useEffect, useRef } from "react";
import { VirtualJoystick } from "../input/VirtualJoystick";
import { GameManager } from "../managers/GameManager";

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

  useEffect(() => {
    if (!pixiContainerRef.current || !myId) return;

    // GameManager のインスタンス化と初期化
    const manager = new GameManager(pixiContainerRef.current, myId);
    manager.init();
    
    // 参照を保持（ジョイスティック入力を渡すため）
    gameManagerRef.current = manager;

    // コンポーネント破棄時のクリーンアップ
    return () => {
      manager.destroy();
      gameManagerRef.current = null;
    };
  }, [myId]);

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative", backgroundColor: "#000" }}>
      {/* PixiJS Canvas 配置領域 */}
      <div ref={pixiContainerRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }} />
      
      {/* UI 配置領域 */}
      <div style={{ position: "absolute", zIndex: 2, width: "100%", height: "100%" }}>
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