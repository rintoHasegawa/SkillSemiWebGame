import { useEffect, useState } from "react";
import { socketClient } from "./network/SocketClient";

// 画面遷移先シーンコンポーネント群
import { TitleScene } from "./scenes/TitleScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { GameScene } from "./scenes/GameScene";

import { roomTypes } from "@repo/shared";

export default function App() {
  // 現在シーン状態
  const [gameState, setGameState] = useState<roomTypes.GameState>(roomTypes.GameState.TITLE);
  // 参加中ルーム情報
  const [room, setRoom] = useState<roomTypes.Room | null>(null);
  // 自身ソケットID
  const [myId, setMyId] = useState<string | null>(null);

  // 接続・ルーム更新・開始通知の購読処理
  useEffect(() => {
    socketClient.onConnect((id) => setMyId(id));
    socketClient.onRoomUpdate((updatedRoom) => {
      setRoom(updatedRoom);
      setGameState(roomTypes.GameState.LOBBY);
    });
    socketClient.onGameStart(() => setGameState(roomTypes.GameState.PLAYING));
  }, []);

  // タイトル画面分岐
  if (gameState === roomTypes.GameState.TITLE) {
    return <TitleScene onJoin={(payload) => socketClient.joinRoom(payload.roomId, payload.playerName)} />;
  }
  
  // ロビー画面分岐
  if (gameState === roomTypes.GameState.LOBBY) {
    return <LobbyScene room={room} myId={myId} onStart={() => socketClient.startGame()} />;
  }

  // プレイ画面分岐
  return <GameScene myId={myId} />;
}