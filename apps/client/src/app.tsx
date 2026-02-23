import { socketClient } from "./network/SocketClient";
import { useGameFlow } from "./hooks/useGameFlow";

// 画面遷移先シーンコンポーネント群
import { TitleScene } from "./scenes/title/TitleScene";
import { LobbyScene } from "./scenes/lobby/LobbyScene";
import { GameScene } from "./scenes/game/GameScene";

import { GameState } from "@repo/shared";

export default function App() {
  const { gameState, room, myId } = useGameFlow();

  // タイトル画面分岐
  if (gameState === GameState.TITLE) {
    return <TitleScene onJoin={(payload) => socketClient.joinRoom(payload.roomId, payload.playerName)} />;
  }
  
  // ロビー画面分岐
  if (gameState === GameState.LOBBY) {
    return <LobbyScene room={room} myId={myId} onStart={() => socketClient.startGame()} />;
  }

  // プレイ画面分岐
  return <GameScene myId={myId} />;
}