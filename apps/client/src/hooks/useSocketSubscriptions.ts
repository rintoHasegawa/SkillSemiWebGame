/**
 * useSocketSubscriptions
 * アプリ共通で必要なソケット購読を登録するフック
 * 接続，ルーム更新，ゲーム開始の購読と解除を一元化する
 */
import { useEffect } from "react";
import { socketManager } from "@client/network/SocketManager";
import { domain } from "@repo/shared";
import type { GameResultPayload } from "@repo/shared";
import type { AppFlowAction } from "./types/appFlowState";

type UseSocketSubscriptionsParams = {
  completeJoinRequest: () => void;
  dispatchAppFlow: (action: AppFlowAction) => void;
import type { Dispatch, SetStateAction } from "react";

type UseSocketSubscriptionsParams = {
  completeJoinRequest: () => void;
  setGameResult: (payload: GameResultPayload | null) => void;
  setMyId: (id: string | null) => void;
  setRoom: (room: domain.room.Room | null) => void;
  setScenePhase: Dispatch<SetStateAction<domain.app.ScenePhaseType>>;
};

type AppSocketHandlers = {
  handleConnect: (id: string) => void;
  handleRoomUpdate: (updatedRoom: domain.room.Room) => void;
  handleGameStart: () => void;
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
}: UseSocketSubscriptionsParams): void => {
  useEffect(() => {
    const handlers: AppSocketHandlers = {
      handleConnect: (id: string) => {
        dispatchAppFlow({ type: "setMyId", myId: id });
      },

      handleRoomUpdate: (updatedRoom: domain.room.Room) => {
        completeJoinRequest();
        dispatchAppFlow({ type: "setRoomAndLobby", room: updatedRoom });
        setRoom(updatedRoom);
        setScenePhase((currentPhase) => {
          if (
            currentPhase === domain.app.ScenePhase.PLAYING ||
            currentPhase === domain.app.ScenePhase.RESULT
          ) {
            return currentPhase;
          }

          return domain.app.ScenePhase.LOBBY;
        });
      },

      handleGameStart: () => {
        dispatchAppFlow({ type: "setPlaying" });
      },

      handleGameResult: (payload: GameResultPayload) => {
        dispatchAppFlow({ type: "setResult", result: payload });
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
  }, [completeJoinRequest, dispatchAppFlow]);
};
