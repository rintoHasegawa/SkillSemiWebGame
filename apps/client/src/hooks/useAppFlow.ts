/**
 * useAppFlow
 * アプリ全体の画面遷移と参加フロー状態を管理するフック
 * 参加要求の成功失敗と接続状態を統合してシーンへ渡す
 */
import { useCallback, useReducer, useRef } from "react";
import { socketManager } from "@client/network/SocketManager";
import { domain } from "@repo/shared";
import { config } from "@client/config";
import type { GameResultPayload } from "@repo/shared";
import {
  appFlowReducer,
  initialAppFlowData,
} from "./application/appFlowReducer";
import { useSocketSubscriptions } from "./useSocketSubscriptions";

/** アプリフロー管理フックの公開状態と操作を表す型 */
type AppFlowState = {
  scenePhase: domain.app.ScenePhaseType;
  room: domain.room.Room | null;
  myId: string | null;
  gameResult: GameResultPayload | null;
  playerName: string;
  joinErrorMessage: string | null;
  isJoining: boolean;
  setPlayerName: (name: string) => void;
  requestJoin: (payload: domain.room.JoinRoomPayload) => void;
  returnToTitle: (options?: { leaveRoom?: boolean }) => void;
};

type JoinState = {
  isJoining: boolean;
  joinFailure: JoinFailure | null;
};

type JoinFailureReason =
  | domain.room.JoinRoomRejectedPayload["reason"]
  | "timeout"
  | "playing";

type JoinFailure = {
  reason: JoinFailureReason;
  roomId?: string;
  playerName?: string;
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

/** アプリ全体のシーン状態と参加要求フローを管理するフック */
export const useAppFlow = (): AppFlowState => {
  const [appFlow, dispatchAppFlow] = useReducer(
    appFlowReducer,
    initialAppFlowData,
  );
  const [joinState, dispatchJoin] = useReducer(joinReducer, initialJoinState);
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const joinRejectedHandlerRef = useRef<
    ((payload: domain.room.JoinRoomRejectedPayload) => void) | null
  >(null);

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

  const completeJoinRequest = useCallback(
    (joinFailure: JoinFailure | null = null) => {
      clearJoinTimeout();
      clearJoinRejectedHandler();
      dispatchJoin({ type: "complete", joinFailure });
    },
    [clearJoinRejectedHandler, clearJoinTimeout],
  );

  const getJoinErrorMessage = useCallback(
    (joinFailure: JoinFailure | null): string | null => {
      if (!joinFailure) {
        return null;
      }

      if (joinFailure.reason === "full") {
        return `ルーム ${joinFailure.roomId ?? ""} は満員です`;
      }

      if (joinFailure.reason === "playing") {
        return `ルーム ${joinFailure.roomId ?? ""} はゲーム中のため参加できません`;
      }

      if (joinFailure.reason === "duplicate") {
        return `ルーム ${joinFailure.roomId ?? ""} への参加要求が重複しました`;
      }

      if (joinFailure.reason === "invalid") {
        // サーバが入力そのものを受け付けなかった場合は再入力条件を案内する
        return (
          `プレイヤー名は${domain.room.PLAYER_NAME_MAX_LENGTH}文字以内，`
          + `ルームIDは${domain.room.ROOM_ID_MAX_LENGTH}文字以内で，`
          + "改行や特殊文字を含まずに入力してください"
        );
      }

      if (joinFailure.reason === "timeout") {
        return "参加要求がタイムアウトしました，もう一度お試しください";
      }

      return null;
    },
    [],
  );

  const requestJoin = useCallback(
    (payload: domain.room.JoinRoomPayload) => {
      if (joinState.isJoining) {
        return;
      }

      completeJoinRequest();
      dispatchJoin({ type: "start" });

      const handleJoinRejected = (
        payload: domain.room.JoinRoomRejectedPayload,
      ) => {
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

      if (payload.playerName.trim() !== "") {
        dispatchAppFlow({
          type: "setPlayerName",
          playerName: payload.playerName,
        });
      }
    },
    [completeJoinRequest, joinState.isJoining],
  );

  const setPlayerName = useCallback((name: string) => {
    dispatchAppFlow({ type: "setPlayerName", playerName: name });
  }, []);

  const returnToTitle = useCallback(
    (options?: { leaveRoom?: boolean }) => {
      completeJoinRequest();
      dispatchAppFlow({
        type: "resetToTitle",
        clearMyId: Boolean(options?.leaveRoom),
      });

      if (!options?.leaveRoom) {
        return;
      }

      socketManager.socket.disconnect();
      socketManager.socket.connect();
    },
    [completeJoinRequest],
  );

  useSocketSubscriptions({
    completeJoinRequest,
    dispatchAppFlow,
    scenePhase: appFlow.scenePhase,
  });

  return {
    scenePhase: appFlow.scenePhase,
    room: appFlow.room,
    myId: appFlow.myId,
    gameResult: appFlow.gameResult,
    playerName: appFlow.playerName,
    joinErrorMessage: getJoinErrorMessage(joinState.joinFailure),
    isJoining: joinState.isJoining,
    setPlayerName,
    requestJoin,
    returnToTitle,
  };
};
