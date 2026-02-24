/**
 * GameScene
 * メインゲーム画面の表示とライフサイクルを管理する
 * GameManagerの初期化と入力配線を行う
 */
import { GameView } from "./GameView";
import { useGameSceneController } from "./hooks/useGameSceneController";

/** GameScene の入力プロパティ */
interface GameSceneProps {
  myId: string | null;
}

/**
 * メインゲーム画面コンポーネント
 * UIの描画と GameManager への入力伝達のみを担当する
 */
export function GameScene({ myId }: GameSceneProps) {
  const { pixiContainerRef, timeLeft, handleInput } = useGameSceneController(myId);

  return (
    <GameView
      timeLeft={timeLeft}
      pixiContainerRef={pixiContainerRef}
      onJoystickInput={handleInput}
    />
  );
}