import { useEffect, useState } from "react";
import { socketManager } from "@client/network/SocketManager";
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
    socketManager.common.onConnect((id) => setMyId(id));
    socketManager.lobby.onRoomUpdate((updatedRoom) => {
      setRoom(updatedRoom);
      setScenePhase(appConsts.ScenePhase.LOBBY);
    });
    socketManager.game.onGameStart(() => setScenePhase(appConsts.ScenePhase.PLAYING));
  }, []);

  return { scenePhase, room, myId };
};
