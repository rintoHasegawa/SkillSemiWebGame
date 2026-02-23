import { socketClient } from "./network/SocketClient";
import { useAppFlow } from "./hooks/useAppFlow";

// 画面遷移先シーンコンポーネント群
import { TitleScene } from "./scenes/title/TitleScene";
import { LobbyScene } from "./scenes/lobby/LobbyScene";
import { GameScene } from "./scenes/game/GameScene";

import { ScenePhase } from "@repo/shared";

export default function App() {
  const { scenePhase, room, myId } = useAppFlow();

  // タイトル画面分岐
  if (scenePhase === ScenePhase.TITLE) {
    return <TitleScene onJoin={(payload) => socketClient.joinRoom(payload)} />;
  }
  
  // ロビー画面分岐
  if (scenePhase === ScenePhase.LOBBY) {
    return <LobbyScene room={room} myId={myId} onStart={() => socketClient.startGame()} />;
  }

  // プレイ画面分岐
  return <GameScene myId={myId} />;
}