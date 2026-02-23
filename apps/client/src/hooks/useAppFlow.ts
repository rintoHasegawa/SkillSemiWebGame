import { useEffect, useState } from "react";
import { socketClient } from "../network/SocketClient";
import { AppState } from "@repo/shared";
import type { AppState as AppStateType, Room } from "@repo/shared";

type AppFlowState = {
  appState: AppStateType;
  room: Room | null;
  myId: string | null;
};

export const useAppFlow = (): AppFlowState => {
  const [appState, setAppState] = useState<AppStateType>(AppState.TITLE);
  const [room, setRoom] = useState<Room | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    socketClient.onConnect((id) => setMyId(id));
    socketClient.onRoomUpdate((updatedRoom) => {
      setRoom(updatedRoom);
      setAppState(AppState.LOBBY);
    });
    socketClient.onGameStart(() => setAppState(AppState.PLAYING));
  }, []);

  return { appState, room, myId };
};
