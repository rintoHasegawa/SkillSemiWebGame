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
    const handleConnect = (id: string) => {
      setMyId(id);
    };
    const handleRoomUpdate = (updatedRoom: roomTypes.Room) => {
      setRoom(updatedRoom);
      setScenePhase(appConsts.ScenePhase.LOBBY);
    };
    const handleGameStart = () => {
      setScenePhase(appConsts.ScenePhase.PLAYING);
    };

    socketManager.common.onConnect(handleConnect);
    socketManager.lobby.onRoomUpdate(handleRoomUpdate);
    socketManager.game.onGameStart(handleGameStart);

    return () => {
      socketManager.common.offConnect(handleConnect);
      socketManager.lobby.offRoomUpdate(handleRoomUpdate);
      socketManager.game.offGameStart(handleGameStart);
    };
  }, []);

  return { scenePhase, room, myId };
};
