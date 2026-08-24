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
  const {
    pixiContainerRef,
    timeLeft,
    startCountdownText,
    isInputEnabled,
    teamPaintRates,
    miniMapTeamIds,
    localBombHitCount,
    localPlayerPosition,
    isFeverTime,
    initStatus,
    handleInput,
    handlePlaceBomb,
  } = useGameSceneController(myId);

  return (
    <GameView
      timeLeft={timeLeft}
      startCountdownText={startCountdownText}
      isInputEnabled={isInputEnabled}
      teamPaintRates={teamPaintRates}
      miniMapTeamIds={miniMapTeamIds}
      localBombHitCount={localBombHitCount}
      localPlayerPosition={localPlayerPosition}
      isFeverTime={isFeverTime}
      initStatus={initStatus}
      pixiContainerRef={pixiContainerRef}
      onJoystickInput={handleInput}
      onPlaceBomb={handlePlaceBomb}
    />
  );
}
