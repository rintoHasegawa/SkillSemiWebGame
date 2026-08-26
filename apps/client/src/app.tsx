import { socketManager } from "./network/SocketManager";
import { useAppFlow } from "./hooks/useAppFlow";

// 画面遷移先シーンコンポーネント群
import { TitleScene } from "./scenes/title/TitleScene";
import { LobbyScene } from "./scenes/lobby/LobbyScene";
import { GameScene } from "./scenes/game/GameScene";
import { ResultScene } from "./scenes/result/ResultScene";
import { LandscapeOnlyGate } from "./components/LandscapeOnlyGate";
import { InstallRequiredGate } from "./components/InstallRequiredGate";

import { domain } from "@repo/shared";

export default function App() {
  const {
    scenePhase,
    room,
    myId,
    gameResult,
    playerName,
    joinErrorMessage,
    connectionNoticeMessage,
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
        connectionNoticeMessage={connectionNoticeMessage}
        isJoining={isJoining}
      />
    );
  }

  // ロビー画面分岐
  // room未受信時はここでフォールバックを描画し，LobbyScene側のHookを
  // 条件分岐に巻き込まないようにする
  if (scenePhase === domain.app.ScenePhase.LOBBY) {
    scene = room ? (
      <LobbyScene
        room={room}
        myId={myId}
        onStart={(payload) =>
          socketManager.lobby.startGame(payload)
        }
        onBackToTitle={() => returnToTitle({ leaveRoom: true })}
      />
    ) : (
      <div style={{ color: "white", padding: 40 }}>読み込み中...</div>
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

  // スマホはインストール（PWA）必須のため，横画面ゲートより外側でインストールゲートを通す
  return (
    <InstallRequiredGate>
      <LandscapeOnlyGate>{scene}</LandscapeOnlyGate>
    </InstallRequiredGate>
  );
}
