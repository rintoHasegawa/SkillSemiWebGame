import { socketManager } from "./network/SocketManager";
import { useAppFlow } from "./hooks/useAppFlow";

// 画面遷移先シーンコンポーネント群
import { TitleScene } from "./scenes/title/TitleScene";
import { LobbyScene } from "./scenes/lobby/LobbyScene";
import { GameScene } from "./scenes/game/GameScene";
import { ResultScene } from "./scenes/result/ResultScene";
import { LandscapeOnlyGate } from "./components/LandscapeOnlyGate";

import { appConsts } from "@repo/shared";

export default function App() {
  const {
    scenePhase,
    room,
    myId,
    gameResult,
    joinErrorMessage,
    isJoining,
    requestJoin,
  } = useAppFlow();

  let scene = <GameScene myId={myId} />;

  // タイトル画面分岐
  if (scenePhase === appConsts.ScenePhase.TITLE) {
    scene = (
      <TitleScene
        onJoin={requestJoin}
        joinErrorMessage={joinErrorMessage}
        isJoining={isJoining}
      />
    );
  }

  // ロビー画面分岐
  if (scenePhase === appConsts.ScenePhase.LOBBY) {
    scene = (
      <LobbyScene
        room={room}
        myId={myId}
        onStart={() => socketManager.lobby.startGame()}
      />
    );
  }

  // 結果画面分岐
  if (scenePhase === appConsts.ScenePhase.RESULT) {
    scene = <ResultScene result={gameResult} />;
  }

  return <LandscapeOnlyGate>{scene}</LandscapeOnlyGate>;
}
