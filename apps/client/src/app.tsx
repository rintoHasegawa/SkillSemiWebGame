import { socketManager } from "./network/SocketManager";
import { useAppFlow } from "./hooks/useAppFlow";

// 画面遷移先シーンコンポーネント群
import { TitleScene } from "./scenes/title/TitleScene";
import { LobbyScene } from "./scenes/lobby/LobbyScene";
import { GameScene } from "./scenes/game/GameScene";
import { ResultScene } from "./scenes/result/ResultScene";

import { appConsts } from "@repo/shared";

export default function App() {
  const { scenePhase, room, myId, gameResult, joinErrorMessage, isJoining, requestJoin } = useAppFlow();

  // タイトル画面分岐
  if (scenePhase === appConsts.ScenePhase.TITLE) {
    return (
      <TitleScene
        onJoin={requestJoin}
        joinErrorMessage={joinErrorMessage}
        isJoining={isJoining}
      />
    );
  }
  
  // ロビー画面分岐
  if (scenePhase === appConsts.ScenePhase.LOBBY) {
    return <LobbyScene room={room} myId={myId} onStart={() => socketManager.lobby.startGame()} />;
  }

  // 結果画面分岐
  if (scenePhase === appConsts.ScenePhase.RESULT) {
    return <ResultScene result={gameResult} />;
  }

  // プレイ画面分岐
  return <GameScene myId={myId} />;
}