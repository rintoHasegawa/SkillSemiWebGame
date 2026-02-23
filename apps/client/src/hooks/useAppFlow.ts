import { useEffect, useState } from "react";
import { socketClient } from "../network/SocketClient";
import { appConsts } from "@repo/shared";
import type { appTypes, roomTypes } from "@repo/shared";

type AppFlowState = {
  scenePhase: appTypes.ScenePhase;
  room: roomTypes.Room | null;
  myId: string | null;
};

export const useAppFlow = (): AppFlowState => {
  const [scenePhase, setScenePhase] = useState<appTypes.ScenePhase>(appConsts.ScenePhase.TITLE);
  const [room, setRoom] = useState<roomTypes.Room | null>(null);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    socketClient.onConnect((id) => setMyId(id));
    socketClient.onRoomUpdate((updatedRoom) => {
      setRoom(updatedRoom);
      setScenePhase(appConsts.ScenePhase.LOBBY);
    });
    socketClient.onGameStart(() => setScenePhase(appConsts.ScenePhase.PLAYING));
  }, []);

  return { scenePhase, room, myId };
};
