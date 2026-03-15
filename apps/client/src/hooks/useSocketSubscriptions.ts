/**
 * useSocketSubscriptions
 * アプリ共通で必要なソケット購読を登録するフック
 * 接続，ルーム更新，ゲーム開始の購読と解除を一元化する
 */
import { useEffect } from "react";
import { socketManager } from "@client/network/SocketManager";
import {
  applyRuntimeMapSizeFromGameStart,
  setRuntimeMapSizeByPreset,
} from "@client/config";
import { domain } from "@repo/shared";
import type { GameResultPayload, GameStartPayload } from "@repo/shared";
import type { AppFlowAction } from "./types/appFlowState";

type UseSocketSubscriptionsParams = {
  completeJoinRequest: () => void;
  dispatchAppFlow: (action: AppFlowAction) => void;
  scenePhase: domain.app.ScenePhaseType;
};

type AppSocketHandlers = {
  handleConnect: (id: string) => void;
  handleRoomUpdate: (updatedRoom: domain.room.Room) => void;
  handleGameStart: (payload: GameStartPayload) => void;
  handleGameResult: (payload: GameResultPayload) => void;
};

const registerConnectionSubscriptions = ({
  handleConnect,
}: AppSocketHandlers): void => {
  socketManager.common.onConnect(handleConnect);
};

const unregisterConnectionSubscriptions = ({
  handleConnect,
}: AppSocketHandlers): void => {
  socketManager.common.offConnect(handleConnect);
};

const registerRoomSubscriptions = ({
  handleRoomUpdate,
}: AppSocketHandlers): void => {
  socketManager.lobby.onRoomUpdate(handleRoomUpdate);
};

const unregisterRoomSubscriptions = ({
  handleRoomUpdate,
}: AppSocketHandlers): void => {
  socketManager.lobby.offRoomUpdate(handleRoomUpdate);
};

const registerGameSubscriptions = ({
  handleGameStart,
  handleGameResult,
}: AppSocketHandlers): void => {
  socketManager.game.onGameStart(handleGameStart);
  socketManager.game.onGameResult(handleGameResult);
};

const unregisterGameSubscriptions = ({
  handleGameStart,
  handleGameResult,
}: AppSocketHandlers): void => {
  socketManager.game.offGameStart(handleGameStart);
  socketManager.game.offGameResult(handleGameResult);
};

/** アプリ共通のソケット購読を登録しクリーンアップするフック */
export const useSocketSubscriptions = ({
  completeJoinRequest,
  dispatchAppFlow,
  scenePhase,
}: UseSocketSubscriptionsParams): void => {
  useEffect(() => {
    const handlers: AppSocketHandlers = {
      handleConnect: (id: string) => {
        dispatchAppFlow({ type: "setMyId", myId: id });
      },

      handleRoomUpdate: (updatedRoom: domain.room.Room) => {
        completeJoinRequest();
        setRuntimeMapSizeByPreset(updatedRoom.fieldSizePreset);
        if (
          scenePhase === domain.app.ScenePhase.PLAYING ||
          scenePhase === domain.app.ScenePhase.RESULT
        ) {
          dispatchAppFlow({ type: "updateRoom", room: updatedRoom });
        } else {
          dispatchAppFlow({ type: "setRoomAndLobby", room: updatedRoom });
        }
      },

      handleGameStart: (payload) => {
        applyRuntimeMapSizeFromGameStart(payload);
        dispatchAppFlow({ type: "setPlaying" });
      },

      handleGameResult: (payload: GameResultPayload) => {
        dispatchAppFlow({ type: "setResult", result: payload });
        socketManager.socket.disconnect();
        socketManager.socket.connect();
      },
    };

    registerConnectionSubscriptions(handlers);
    registerRoomSubscriptions(handlers);
    registerGameSubscriptions(handlers);

    return () => {
      completeJoinRequest();
      unregisterConnectionSubscriptions(handlers);
      unregisterRoomSubscriptions(handlers);
      unregisterGameSubscriptions(handlers);
    };
  }, [completeJoinRequest, dispatchAppFlow, scenePhase]);
};
