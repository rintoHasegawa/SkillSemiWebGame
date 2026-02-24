import { useEffect, useState } from "react";
import { socketManager } from "@client/network/SocketManager";
import { appConsts } from "@repo/shared";
import type { appTypes, roomTypes } from "@repo/shared";

type AppFlowState = {
  scenePhase: appTypes.ScenePhase;
  room: roomTypes.Room | null;
  myId: string | null;
  joinErrorMessage: string | null;
};

export const useAppFlow = (): AppFlowState => {
  const [scenePhase, setScenePhase] = useState<appTypes.ScenePhase>(appConsts.ScenePhase.TITLE);
  const [room, setRoom] = useState<roomTypes.Room | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [joinErrorMessage, setJoinErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleConnect = (id: string) => {
      setMyId(id);
    };
    const handleRoomUpdate = (updatedRoom: roomTypes.Room) => {
      setRoom(updatedRoom);
      setJoinErrorMessage(null);
      setScenePhase(appConsts.ScenePhase.LOBBY);
    };
    const handleJoinRejected = (payload: roomTypes.JoinRoomRejectedPayload) => {
      if (payload.reason === "full") {
        setJoinErrorMessage(`ルーム ${payload.roomId} は満員です`);
      }
    };
    const handleGameStart = () => {
      setScenePhase(appConsts.ScenePhase.PLAYING);
    };

    socketManager.common.onConnect(handleConnect);
    socketManager.title.onJoinRejected(handleJoinRejected);
    socketManager.lobby.onRoomUpdate(handleRoomUpdate);
    socketManager.game.onGameStart(handleGameStart);

    return () => {
      socketManager.common.offConnect(handleConnect);
      socketManager.title.offJoinRejected(handleJoinRejected);
      socketManager.lobby.offRoomUpdate(handleRoomUpdate);
      socketManager.game.offGameStart(handleGameStart);
    };
  }, []);

  return { scenePhase, room, myId, joinErrorMessage };
};
