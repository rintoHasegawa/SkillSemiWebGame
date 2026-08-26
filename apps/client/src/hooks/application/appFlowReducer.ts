/**
 * appFlowReducer
 * アプリフロー状態の遷移ロジックを管理する
 * 画面状態と付随データの更新を一箇所で扱う
 * プレイ中の切断は席への復帰を待つ状態として保持し，破棄と区別する
 */
import { domain } from "@repo/shared";
import type {
  AppFlowAction,
  AppFlowData,
  ConnectionNoticeType,
} from "../types/appFlowState";

/** アプリフロー状態の初期値 */
export const initialAppFlowData: AppFlowData = {
  scenePhase: domain.app.ScenePhase.TITLE,
  room: null,
  myId: null,
  gameResult: null,
  playerName: "",
  connectionNotice: null,
  isReconnecting: false,
  isProtocolMismatch: false,
};

// セッションを破棄し，理由を通知しながらタイトルへ戻した状態を生成する
const createTitleNoticeState = (
  state: AppFlowData,
  connectionNotice: ConnectionNoticeType,
): AppFlowData => {
  return {
    scenePhase: domain.app.ScenePhase.TITLE,
    room: null,
    myId: null,
    gameResult: null,
    playerName: state.playerName,
    connectionNotice,
    isReconnecting: false,
    // 版ずれの通知は接続断とは別要因のため引き継ぐ
    isProtocolMismatch: state.isProtocolMismatch,
  };
};

/** アプリフロー状態をアクションに応じて更新する */
export const appFlowReducer = (
  state: AppFlowData,
  action: AppFlowAction,
): AppFlowData => {
  if (action.type === "connectionEstablished") {
    // 復帰待ちの間は myId を書き換えない
    // playerId はソケットIDと切り離されており，復帰の成否が確定するまで
    // 切断前の識別子で所属ルームの判定を続ける必要があるため
    if (
      state.isReconnecting &&
      state.scenePhase === domain.app.ScenePhase.PLAYING
    ) {
      return state;
    }

    return { ...state, myId: action.myId };
  }

  if (action.type === "connectionLost") {
    // プレイ中は自動再接続で席へ戻れるため，画面を保持したまま復帰を待つ
    if (state.scenePhase === domain.app.ScenePhase.PLAYING) {
      return {
        ...state,
        isReconnecting: true,
      };
    }

    // ロビーでの切断は復帰対象外のためセッションを破棄する
    if (state.scenePhase === domain.app.ScenePhase.LOBBY) {
      return createTitleNoticeState(state, "disconnected");
    }

    // タイトル・リザルトでの切断は意図的な再接続を含むため無視する
    return state;
  }

  if (action.type === "clearConnectionNotice") {
    return {
      ...state,
      connectionNotice: null,
    };
  }

  if (action.type === "protocolVersionMismatch") {
    return {
      ...state,
      isProtocolMismatch: true,
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

  if (action.type === "sessionResumed") {
    // 識別子・ルーム・画面状態を一度に確定させ，所属判定の食い違いを防ぐ
    return {
      ...state,
      myId: action.playerId,
      room: action.room,
      scenePhase: domain.app.ScenePhase.PLAYING,
      connectionNotice: null,
      isReconnecting: false,
    };
  }

  if (action.type === "resumeRejected") {
    // 席の予約はゲームセッションと寿命を共にするため，予約が見つからないこと
    // （expired）と試合が終わっていることは同値になる
    // 復帰要求はプレイ中の再接続でしか送らないため，理由によらず試合終了を伝える
    return createTitleNoticeState(state, "game_ended");
  }

  if (action.type === "resetToTitle") {
    return {
      scenePhase: domain.app.ScenePhase.TITLE,
      room: null,
      myId: action.clearMyId ? null : state.myId,
      gameResult: null,
      playerName: state.playerName,
      // 明示的なタイトル復帰では接続断の通知を消す
      connectionNotice: null,
      isReconnecting: false,
      // 版ずれは再入室しても解消しないため playerName と同様に保持する
      isProtocolMismatch: state.isProtocolMismatch,
    };
  }

  return state;
};
