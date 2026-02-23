import { useEffect, useState } from "react";
import { socketClient } from "../network/SocketClient";
import { GameState } from "@repo/shared";
import type { GameStateType, Room } from "@repo/shared";

type GameFlowState = {
  gameState: GameStateType;
  room: Room | null;
  myId: string | null;
};

export const useGameFlow = (): GameFlowState => {
  const [gameState, setGameState] = useState<GameStateType>(GameState.TITLE);
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

  return { gameState, room, myId };
};
