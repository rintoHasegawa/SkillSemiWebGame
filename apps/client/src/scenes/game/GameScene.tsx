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

/** メインゲーム画面を描画し入力をゲーム制御へ橋渡しする */
export function GameScene({ myId }: GameSceneProps) {
  const { pixiContainerRef, timeLeft, handleInput, handlePlaceBomb } = useGameSceneController(myId);

  return (
    <GameView
      timeLeft={timeLeft}
      pixiContainerRef={pixiContainerRef}
      onJoystickInput={handleInput}
      onPlaceBomb={handlePlaceBomb}
    />
  );
}