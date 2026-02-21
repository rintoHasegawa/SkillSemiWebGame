import { useEffect, useState } from "react";
import { socketClient } from "./network/SocketClient";

// シーン（画面）コンポーネント
import { TitleScene } from "./scenes/TitleScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { GameScene } from "./scenes/GameScene";

import { GameState, type Room } from "@repo/shared/src/types/room";

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.TITLE);
  const [room, setRoom] = useState<Room | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    socketClient.onConnect((id) => setMyId(id));
    socketClient.onRoomUpdate((updatedRoom) => {
      setRoom(updatedRoom);
      setGameState(GameState.LOBBY);
    });
    socketClient.onGameStart(() => setGameState(GameState.PLAYING));
  }, []);

  // レンダリング分岐
  if (gameState === GameState.TITLE) {
    return <TitleScene onJoin={(payload) => socketClient.joinRoom(payload.roomId, payload.playerName)} />;
  }
  
  if (gameState === GameState.LOBBY) {
    return <LobbyScene room={room} myId={myId} onStart={() => socketClient.startGame()} />;
  }

  // playing 状態なら GameScene をレンダリング
  return <GameScene myId={myId} />;
}