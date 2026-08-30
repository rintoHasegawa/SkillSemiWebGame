/**
 * useAppFlow
 * アプリ全体の画面遷移と参加フロー状態を管理するフック
 * 参加要求の成功失敗と接続状態を統合してシーンへ渡す
 */
import { useCallback, useEffect, useReducer, useRef } from "react";
import { socketManager } from "@client/network/SocketManager";
import { domain } from "@repo/shared";
import { config } from "@client/config";
import type { GameResultPayload } from "@repo/shared";
import {
  appFlowReducer,
  initialAppFlowData,
} from "./application/appFlowReducer";
import {
  loadPlayerName,
  savePlayerName,
} from "./application/playerNameStorage";
import type { RoomMembership } from "./application/roomEventGuards";
import type { AppFlowData, ConnectionNoticeType } from "./types/appFlowState";
import {
  useSocketSubscriptions,
  type ReconnectStatus,
} from "./useSocketSubscriptions";

/** アプリフロー管理フックの公開状態と操作を表す型 */
type AppFlowState = {
  scenePhase: domain.app.ScenePhaseType;
  room: domain.room.Room | null;
  myId: string | null;
  gameResult: GameResultPayload | null;
  playerName: string;
  joinErrorMessage: string | null;
  connectionNoticeMessage: string | null;
  protocolMismatchMessage: string | null;
  /** プレイ中の切断から席へ復帰しようとしている最中か */
  isReconnecting: boolean;
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

// 保存済みのプレイヤー名を初期状態へ反映する（reducer は純粋関数のまま保つ）
const createInitialAppFlowData = (baseData: AppFlowData): AppFlowData => {
  return {
    ...baseData,
    playerName: loadPlayerName(),
  };
};

// タイトルへ戻した理由に応じた通知文言を返す
const getConnectionNoticeMessage = (
  connectionNotice: ConnectionNoticeType | null,
): string | null => {
  if (connectionNotice === "disconnected") {
    return "接続が切れました，もう一度参加してください";
  }

  if (connectionNotice === "game_ended") {
    return "試合は終了しました";
  }

  return null;
};

// 参加要求が失敗した理由に応じたエラー文言を返す
const getJoinErrorMessage = (
  joinFailure: JoinFailure | null,
): string | null => {
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
};

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
    createInitialAppFlowData,
  );
  const [joinState, dispatchJoin] = useReducer(joinReducer, initialJoinState);
  const joinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 購読を張り直さずに最新の所属状態を参照できるよう ref へ同期する
  const membershipRef = useRef<RoomMembership>({
    currentRoomId: null,
    myId: null,
  });
  // connect の同期発火でも最新の復帰状態を読めるよう ref へ同期する
  const reconnectRef = useRef<ReconnectStatus>({
    scenePhase: domain.app.ScenePhase.TITLE,
    isReconnecting: false,
  });
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

  const requestJoin = useCallback(
    (payload: domain.room.JoinRoomPayload) => {
      if (joinState.isJoining) {
        return;
      }

      completeJoinRequest();
      // 再参加を開始した時点で前回の接続断通知を消す
      dispatchAppFlow({ type: "clearConnectionNotice" });
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

      // 切断せずに明示退室し，サーバ側の席と復帰予約を解放する
      socketManager.lobby.leaveRoom();
    },
    [completeJoinRequest],
  );

  // タイトルでのリロードで名前が失われないよう永続化する
  useEffect(() => {
    savePlayerName(appFlow.playerName);
  }, [appFlow.playerName]);

  useEffect(() => {
    membershipRef.current = {
      currentRoomId: appFlow.room?.roomId ?? null,
      myId: appFlow.myId,
    };
  }, [appFlow.myId, appFlow.room?.roomId]);

  useEffect(() => {
    reconnectRef.current = {
      scenePhase: appFlow.scenePhase,
      isReconnecting: appFlow.isReconnecting,
    };
  }, [appFlow.isReconnecting, appFlow.scenePhase]);

  useSocketSubscriptions({
    completeJoinRequest,
    dispatchAppFlow,
    scenePhase: appFlow.scenePhase,
    membershipRef,
    reconnectRef,
  });

  return {
    scenePhase: appFlow.scenePhase,
    room: appFlow.room,
    myId: appFlow.myId,
    gameResult: appFlow.gameResult,
    playerName: appFlow.playerName,
    joinErrorMessage: getJoinErrorMessage(joinState.joinFailure),
    connectionNoticeMessage: getConnectionNoticeMessage(
      appFlow.connectionNotice,
    ),
    protocolMismatchMessage: appFlow.isProtocolMismatch
      ? "アプリの更新が必要です，一度アプリを終了してから開き直してください"
      : null,
    isReconnecting: appFlow.isReconnecting,
    isJoining: joinState.isJoining,
    setPlayerName,
    requestJoin,
    returnToTitle,
  };
};
