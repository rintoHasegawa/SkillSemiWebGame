import { socketManager } from "./network/SocketManager";
import { useAppFlow } from "./hooks/useAppFlow";

// 画面遷移先シーンコンポーネント群
import { TitleScene } from "./scenes/title/TitleScene";
import { LobbyScene } from "./scenes/lobby/LobbyScene";
import { GameScene } from "./scenes/game/GameScene";

import { appConsts } from "@repo/shared";

export default function App() {
  const { scenePhase, room, myId, joinErrorMessage, isJoining, requestJoin } = useAppFlow();

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

  // プレイ画面分岐
  return <GameScene myId={myId} />;
}