import { useCallback, useEffect, useReducer, useRef, useState } from "react";
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

type JoinState = {
  isJoining: boolean;
  joinErrorMessage: string | null;
};

type JoinAction =
  | { type: "start" }
  | { type: "complete"; errorMessage: string | null };

const initialJoinState: JoinState = {
  isJoining: false,
  joinErrorMessage: null,
};

const joinReducer = (state: JoinState, action: JoinAction): JoinState => {
  if (action.type === "start") {
    return {
      isJoining: true,
      joinErrorMessage: null,
    };
  }

  if (action.type === "complete") {
    return {
      isJoining: false,
      joinErrorMessage: action.errorMessage,
    };
  }

  return state;
};

export const useAppFlow = (): AppFlowState => {
  const [scenePhase, setScenePhase] = useState<appTypes.ScenePhase>(appConsts.ScenePhase.TITLE);
  const [room, setRoom] = useState<roomTypes.Room | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [joinState, dispatchJoin] = useReducer(joinReducer, initialJoinState);
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinRejectedHandlerRef = useRef<((payload: roomTypes.JoinRoomRejectedPayload) => void) | null>(null);

  const clearJoinRejectedHandler = useCallback(() => {
    if (!joinRejectedHandlerRef.current) {
      return;
    }

    socketManager.title.offJoinRejected(joinRejectedHandlerRef.current);
    joinRejectedHandlerRef.current = null;
  }, []);

  const clearJoinTimeout = useCallback(() => {
    if (!joinTimeoutRef.current) {
      return;
    }

    clearTimeout(joinTimeoutRef.current);
    joinTimeoutRef.current = null;
  }, []);

  const completeJoinRequest = useCallback((errorMessage: string | null = null) => {
    clearJoinTimeout();
    clearJoinRejectedHandler();
    dispatchJoin({ type: "complete", errorMessage });
  }, [clearJoinRejectedHandler, clearJoinTimeout]);

  const getJoinRejectedMessage = useCallback((payload: roomTypes.JoinRoomRejectedPayload): string | null => {
    if (payload.reason === "full") {
      return `ルーム ${payload.roomId} は満員です`;
    }

    if (payload.reason === "duplicate") {
      return `ルーム ${payload.roomId} への参加要求が重複しました`;
    }

    return null;
  }, []);

  const requestJoin = useCallback((payload: roomTypes.JoinRoomPayload) => {
    if (joinState.isJoining) {
      return;
    }

    completeJoinRequest();
    dispatchJoin({ type: "start" });

    const handleJoinRejected = (payload: roomTypes.JoinRoomRejectedPayload) => {
      const joinRejectedMessage = getJoinRejectedMessage(payload);
      completeJoinRequest(joinRejectedMessage);
    };

    joinRejectedHandlerRef.current = handleJoinRejected;
    socketManager.title.onceJoinRejected(handleJoinRejected);

    joinTimeoutRef.current = setTimeout(() => {
      completeJoinRequest("参加要求がタイムアウトしました，もう一度お試しください");
    }, config.GAME_CONFIG.JOIN_REQUEST_TIMEOUT_MS);

    socketManager.title.joinRoom(payload);
  }, [completeJoinRequest, getJoinRejectedMessage, joinState.isJoining]);

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
  }, [completeJoinRequest]);

  return {
    scenePhase,
    room,
    myId,
    joinErrorMessage: joinState.joinErrorMessage,
    isJoining: joinState.isJoining,
    requestJoin,
  };
};
