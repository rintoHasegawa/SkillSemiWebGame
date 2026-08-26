import { useEffect, useState } from "react";

import { socketManager } from "./network/SocketManager";
import { useAppFlow } from "./hooks/useAppFlow";
import { useAppUpdateGate } from "./hooks/useAppUpdateGate";

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
    protocolMismatchMessage,
    isJoining,
    setPlayerName,
    requestJoin,
    returnToTitle,
  } = useAppFlow();

  // 更新ゲートから参照するため，タイトルのフォーム表示状態をここで保持する
  const [isTitleFormOpen, setIsTitleFormOpen] = useState(false);

  // タイトル以外へ遷移したら，戻った時に再び「TAP TO START」から始まるよう戻す
  useEffect(() => {
    if (scenePhase === domain.app.ScenePhase.TITLE) {
      return;
    }

    setIsTitleFormOpen(false);
  }, [scenePhase]);

  useAppUpdateGate({
    scenePhase,
    isTitleFormOpen,
    // 通知が消えて状況が分からなくなることを防ぐため，表示中はリロードしない
    hasConnectionNotice:
      connectionNoticeMessage !== null || protocolMismatchMessage !== null,
  });

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
        protocolMismatchMessage={protocolMismatchMessage}
        isJoining={isJoining}
        isFormOpen={isTitleFormOpen}
        onOpenForm={() => setIsTitleFormOpen(true)}
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
