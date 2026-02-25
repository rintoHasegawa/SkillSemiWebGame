import { useEffect } from "react";
import { socketManager } from "@client/network/SocketManager";
import { appConsts } from "@repo/shared";
import type { appTypes, roomTypes } from "@repo/shared";

type UseSocketSubscriptionsParams = {
  completeJoinRequest: () => void;
  setMyId: (id: string | null) => void;
  setRoom: (room: roomTypes.Room | null) => void;
  setScenePhase: (phase: appTypes.ScenePhase) => void;
};

export const useSocketSubscriptions = ({
  completeJoinRequest,
  setMyId,
  setRoom,
  setScenePhase,
}: UseSocketSubscriptionsParams): void => {
  useEffect(() => {
    const handleConnect = (id: string) => {
      setMyId(id);
    };

    const handleRoomUpdate = (updatedRoom: roomTypes.Room) => {
      completeJoinRequest();
      setRoom(updatedRoom);
      setScenePhase(appConsts.ScenePhase.LOBBY);
    };

    const handleGameStart = () => {
      setScenePhase(appConsts.ScenePhase.PLAYING);
    };

    socketManager.common.onConnect(handleConnect);
    socketManager.lobby.onRoomUpdate(handleRoomUpdate);
    socketManager.game.onceGameStart(handleGameStart);

    return () => {
      completeJoinRequest();
      socketManager.common.offConnect(handleConnect);
      socketManager.lobby.offRoomUpdate(handleRoomUpdate);
    };
  }, [completeJoinRequest, setMyId, setRoom, setScenePhase]);
};
