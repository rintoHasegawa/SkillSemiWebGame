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
};

/** アプリフロー状態をアクションに応じて更新する */
export const appFlowReducer = (
  state: AppFlowData,
  action: AppFlowAction,
): AppFlowData => {
  if (action.type === "setMyId") {
    return {
      ...state,
      myId: action.myId,
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
    };
  }

  return state;
};
