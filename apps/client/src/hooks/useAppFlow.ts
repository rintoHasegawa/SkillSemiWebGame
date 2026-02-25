import { useCallback, useReducer, useRef, useState } from "react";
import { socketManager } from "@client/network/SocketManager";
import { appConsts, config } from "@repo/shared";
import type { appTypes, roomTypes } from "@repo/shared";
import { useSocketSubscriptions } from "./useSocketSubscriptions";

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
  joinFailure: JoinFailure | null;
};

type JoinFailureReason = roomTypes.JoinRoomRejectedPayload["reason"] | "timeout";

type JoinFailure = {
  reason: JoinFailureReason;
  roomId?: string;
};

type JoinAction =
  | { type: "start" }
  | { type: "complete"; joinFailure: JoinFailure | null };

const initialJoinState: JoinState = {
  isJoining: false,
  joinFailure: null,
};

const joinReducer = (state: JoinState, action: JoinAction): JoinState => {
  if (action.type === "start") {
    return {
      isJoining: true,
      joinFailure: null,
    };
  }

  if (action.type === "complete") {
    return {
      isJoining: false,
      joinFailure: action.joinFailure,
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

  const completeJoinRequest = useCallback((joinFailure: JoinFailure | null = null) => {
    clearJoinTimeout();
    clearJoinRejectedHandler();
    dispatchJoin({ type: "complete", joinFailure });
  }, [clearJoinRejectedHandler, clearJoinTimeout]);

  const getJoinErrorMessage = useCallback((joinFailure: JoinFailure | null): string | null => {
    if (!joinFailure) {
      return null;
    }

    if (joinFailure.reason === "full") {
      return `ルーム ${joinFailure.roomId ?? ""} は満員です`;
    }

    if (joinFailure.reason === "duplicate") {
      return `ルーム ${joinFailure.roomId ?? ""} への参加要求が重複しました`;
    }

    if (joinFailure.reason === "timeout") {
      return "参加要求がタイムアウトしました，もう一度お試しください";
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
      completeJoinRequest({
        reason: payload.reason,
        roomId: payload.roomId,
      });
    };

    joinRejectedHandlerRef.current = handleJoinRejected;
    socketManager.title.onceJoinRejected(handleJoinRejected);

    joinTimeoutRef.current = setTimeout(() => {
      completeJoinRequest({ reason: "timeout" });
    }, config.GAME_CONFIG.JOIN_REQUEST_TIMEOUT_MS);

    socketManager.title.joinRoom(payload);
  }, [completeJoinRequest, joinState.isJoining]);

  useSocketSubscriptions({
    completeJoinRequest,
    setMyId,
    setRoom,
    setScenePhase,
  });

  return {
    scenePhase,
    room,
    myId,
    joinErrorMessage: getJoinErrorMessage(joinState.joinFailure),
    isJoining: joinState.isJoining,
    requestJoin,
  };
};
