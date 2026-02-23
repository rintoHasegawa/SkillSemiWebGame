import { useEffect, useState } from "react";
import { socketClient } from "../network/SocketClient";
import { ScenePhase } from "@repo/shared";
import type { ScenePhase as ScenePhaseType, Room } from "@repo/shared";

type AppFlowState = {
  scenePhase: ScenePhaseType;
  room: Room | null;
  myId: string | null;
};

export const useAppFlow = (): AppFlowState => {
  const [scenePhase, setScenePhase] = useState<ScenePhaseType>(ScenePhase.TITLE);
  const [room, setRoom] = useState<Room | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    socketClient.onConnect((id) => setMyId(id));
    socketClient.onRoomUpdate((updatedRoom) => {
      setRoom(updatedRoom);
      setScenePhase(ScenePhase.LOBBY);
    });
    socketClient.onGameStart(() => setScenePhase(ScenePhase.PLAYING));
  }, []);

  return { scenePhase, room, myId };
};
