/**
 * app
 * 画面フェーズに応じて表示するシーンを切り替えるルートコンポーネント
 * 再接続待ち・ルーム未受信といった過渡状態のフォールバック表示もここで扱う
 */
import { useEffect, useState } from "react";

import { socketManager } from "./network/SocketManager";
import { useAppFlow } from "./hooks/useAppFlow";
import { useAppUpdateGate } from "./hooks/useAppUpdateGate";
import { useChunkLoadRecovery } from "./hooks/useChunkLoadRecovery";

// 画面遷移先シーンコンポーネント群
import { TitleScene } from "./scenes/title/TitleScene";
import { LobbyScene } from "./scenes/lobby/LobbyScene";
import { GameScene } from "./scenes/game/GameScene";
import { ResultScene } from "./scenes/result/ResultScene";
import { LandscapeOnlyGate } from "./components/LandscapeOnlyGate";
import { InstallRequiredGate } from "./components/InstallRequiredGate";
import { ReconnectingNotice } from "./components/ReconnectingNotice";

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
    isReconnecting,
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

  // 再デプロイでチャンクが 404 になったページを自動復旧する（更新ゲートとは独立）
  useChunkLoadRecovery();

  useAppUpdateGate({
    scenePhase,
    isTitleFormOpen,
    // 通知が消えて状況が分からなくなることを防ぐため，表示中はリロードしない
    hasConnectionNotice:
      connectionNoticeMessage !== null || protocolMismatchMessage !== null,
  });

  // 再接続中は操作できないゲーム画面を残さず，復帰待ちであることだけを伝える
  // 復帰後は GameScene が再マウントされ，READY_FOR_GAME からゲーム状態を取り直す
  let scene = isReconnecting ? (
    <ReconnectingNotice
      onBackToTitle={() => returnToTitle({ leaveRoom: true })}
    />
  ) : (
    <GameScene myId={myId} />
  );

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
