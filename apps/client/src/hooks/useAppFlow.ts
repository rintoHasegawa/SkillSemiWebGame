import { useEffect, useRef, useState } from "react";
import { socketManager } from "@client/network/SocketManager";
import { appConsts, config } from "@repo/shared";
import type { appTypes, roomTypes } from "@repo/shared";

type AppFlowState = {
  scenePhase: appTypes.ScenePhase;
  room: roomTypes.Room | null;
  myId: string | null;
  joinErrorMessage: string | null;
  isJoining: boolean;
  requestJoin: (payload: roomTypes.JoinRoomPayload) => void;
};

export const useAppFlow = (): AppFlowState => {
  const [scenePhase, setScenePhase] = useState<appTypes.ScenePhase>(appConsts.ScenePhase.TITLE);
  const [room, setRoom] = useState<roomTypes.Room | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [joinErrorMessage, setJoinErrorMessage] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearJoinTimeout = () => {
    if (!joinTimeoutRef.current) {
      return;
    }

    clearTimeout(joinTimeoutRef.current);
    joinTimeoutRef.current = null;
  };

  const requestJoin = (payload: roomTypes.JoinRoomPayload) => {
    if (isJoining) {
      return;
    }

    clearJoinTimeout();
    setJoinErrorMessage(null);
    setIsJoining(true);
    joinTimeoutRef.current = setTimeout(() => {
      setIsJoining(false);
      setJoinErrorMessage("参加要求がタイムアウトしました，もう一度お試しください");
      joinTimeoutRef.current = null;
    }, config.GAME_CONFIG.JOIN_REQUEST_TIMEOUT_MS);
    socketManager.title.joinRoom(payload);
  };

  useEffect(() => {
    const handleConnect = (id: string) => {
      setMyId(id);
    };
    const handleRoomUpdate = (updatedRoom: roomTypes.Room) => {
      clearJoinTimeout();
      setRoom(updatedRoom);
      setIsJoining(false);
      setJoinErrorMessage(null);
      setScenePhase(appConsts.ScenePhase.LOBBY);
    };
    const handleJoinRejected = (payload: roomTypes.JoinRoomRejectedPayload) => {
      clearJoinTimeout();
      setIsJoining(false);
      if (payload.reason === "full") {
        setJoinErrorMessage(`ルーム ${payload.roomId} は満員です`);
        return;
      }

      if (payload.reason === "duplicate") {
        setJoinErrorMessage(`ルーム ${payload.roomId} への参加要求が重複しました`);
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
      clearJoinTimeout();
      socketManager.common.offConnect(handleConnect);
      socketManager.title.offJoinRejected(handleJoinRejected);
      socketManager.lobby.offRoomUpdate(handleRoomUpdate);
      socketManager.game.offGameStart(handleGameStart);
    };
  }, []);

  return { scenePhase, room, myId, joinErrorMessage, isJoining, requestJoin };
};
