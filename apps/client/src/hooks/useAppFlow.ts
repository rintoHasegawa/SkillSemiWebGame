import { useEffect, useState } from "react";
import { socketManager } from "../network/SocketManager";
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
    socketManager.connection.onConnect((id) => setMyId(id));
    socketManager.room.onRoomUpdate((updatedRoom) => {
      setRoom(updatedRoom);
      setScenePhase(appConsts.ScenePhase.LOBBY);
    });
    socketManager.game.onGameStart(() => setScenePhase(appConsts.ScenePhase.PLAYING));
  }, []);

  return { scenePhase, room, myId };
};
