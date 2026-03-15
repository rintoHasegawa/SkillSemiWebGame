import { socketManager } from "./network/SocketManager";
import { useAppFlow } from "./hooks/useAppFlow";

// 画面遷移先シーンコンポーネント群
import { TitleScene } from "./scenes/title/TitleScene";
import { LobbyScene } from "./scenes/lobby/LobbyScene";
import { GameScene } from "./scenes/game/GameScene";
import { ResultScene } from "./scenes/result/ResultScene";
import { LandscapeOnlyGate } from "./components/LandscapeOnlyGate";

import { domain } from "@repo/shared";

export default function App() {
  const {
    scenePhase,
    room,
    myId,
    gameResult,
    playerName,
    joinErrorMessage,
    isJoining,
    setPlayerName,
    requestJoin,
    returnToTitle,
  } = useAppFlow();

  let scene = <GameScene myId={myId} />;

  // タイトル画面分岐
  if (scenePhase === domain.app.ScenePhase.TITLE) {
    scene = (
      <TitleScene
        onJoin={requestJoin}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        joinErrorMessage={joinErrorMessage}
        isJoining={isJoining}
      />
    );
  }

  // ロビー画面分岐
  if (scenePhase === domain.app.ScenePhase.LOBBY) {
    scene = (
      <LobbyScene
        room={room}
        myId={myId}
        onStart={(payload) =>
          socketManager.lobby.startGame(payload)
        }
        onBackToTitle={() => returnToTitle({ leaveRoom: true })}
      />
    );
  }

  // 結果画面分岐
  if (scenePhase === domain.app.ScenePhase.RESULT) {
    scene = (
      <ResultScene
        result={gameResult}
        onBackToTitle={() => returnToTitle()}
      />
    );
  }

  return <LandscapeOnlyGate>{scene}</LandscapeOnlyGate>;
}
