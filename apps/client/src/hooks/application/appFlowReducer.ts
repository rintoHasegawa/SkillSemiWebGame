/**
 * appFlowReducer
 * アプリフロー状態の遷移ロジックを管理する
 * 画面状態と付随データの更新を一箇所で扱う
 */
import { domain } from "@repo/shared";
import type { AppFlowAction, AppFlowData } from "../types/appFlowState";

/** アプリフロー状態の初期値 */
export const initialAppFlowData: AppFlowData = {
  scenePhase: domain.app.ScenePhase.TITLE,
  room: null,
  myId: null,
  gameResult: null,
  playerName: "",
  isConnectionLost: false,
};

// サーバ上のセッションに依存しているフェーズかどうかを判定する
const isSessionBoundPhase = (
  scenePhase: domain.app.ScenePhaseType,
): boolean => {
  return (
    scenePhase === domain.app.ScenePhase.LOBBY ||
    scenePhase === domain.app.ScenePhase.PLAYING
  );
};

// セッションを破棄してタイトルへ戻した状態を生成する
const createConnectionLostState = (state: AppFlowData): AppFlowData => {
  return {
    scenePhase: domain.app.ScenePhase.TITLE,
    room: null,
    myId: null,
    gameResult: null,
    playerName: state.playerName,
    isConnectionLost: true,
  };
};

/** アプリフロー状態をアクションに応じて更新する */
export const appFlowReducer = (
  state: AppFlowData,
  action: AppFlowAction,
): AppFlowData => {
  if (action.type === "connectionEstablished") {
    // 再接続で socket.id が変わった場合，サーバ上のセッションは既に破棄されている
    const isReconnectedWithNewId =
      state.myId !== null && state.myId !== action.myId;

    if (isReconnectedWithNewId && isSessionBoundPhase(state.scenePhase)) {
      return { ...createConnectionLostState(state), myId: action.myId };
    }

    return { ...state, myId: action.myId };
  }

  if (action.type === "connectionLost") {
    // タイトル・リザルトでの切断は意図的な再接続を含むため無視する
    if (!isSessionBoundPhase(state.scenePhase)) {
      return state;
    }

    return createConnectionLostState(state);
  }

  if (action.type === "clearConnectionNotice") {
    return {
      ...state,
      isConnectionLost: false,
    };
  }

  if (action.type === "setPlayerName") {
    return {
      ...state,
      playerName: action.playerName,
    };
  }

  if (action.type === "setRoomAndLobby") {
    return {
      ...state,
      room: action.room,
      // ロビーへ戻った時点で前ゲームの結果を破棄する
      gameResult: null,
      scenePhase: domain.app.ScenePhase.LOBBY,
    };
  }

  if (action.type === "updateRoom") {
    return {
      ...state,
      room: action.room,
    };
  }

  if (action.type === "setPlaying") {
    return {
      ...state,
      gameResult: null,
      scenePhase: domain.app.ScenePhase.PLAYING,
    };
  }

  if (action.type === "setResult") {
    return {
      ...state,
      gameResult: action.result,
      scenePhase: domain.app.ScenePhase.RESULT,
    };
  }

  if (action.type === "resetToTitle") {
    return {
      scenePhase: domain.app.ScenePhase.TITLE,
      room: null,
      myId: action.clearMyId ? null : state.myId,
      gameResult: null,
      playerName: state.playerName,
      // 明示的なタイトル復帰では接続断の通知を消す
      isConnectionLost: false,
    };
  }

  return state;
};
