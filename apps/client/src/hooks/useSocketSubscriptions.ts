/**
 * useSocketSubscriptions
 * アプリ共通で必要なソケット購読を登録するフック
 * 接続，ルーム更新，ゲーム開始の購読と解除を一元化する
 */
import { useEffect } from "react";
import { socketManager } from "@client/network/SocketManager";
import { domain } from "@repo/shared";
import type { GameResultPayload } from "@repo/shared";

type UseSocketSubscriptionsParams = {
  completeJoinRequest: () => void;
  setGameResult: (payload: GameResultPayload | null) => void;
  setMyId: (id: string | null) => void;
  setRoom: (room: domain.room.Room | null) => void;
  setScenePhase: (phase: domain.app.ScenePhaseType) => void;
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
  setGameResult,
  setMyId,
  setRoom,
  setScenePhase,
}: UseSocketSubscriptionsParams): void => {
  useEffect(() => {
    const handlers: AppSocketHandlers = {
      handleConnect: (id: string) => {
        setMyId(id);
      },

      handleRoomUpdate: (updatedRoom: domain.room.Room) => {
        completeJoinRequest();
        setRoom(updatedRoom);
        setScenePhase(domain.app.ScenePhase.LOBBY);
      },

      handleGameStart: () => {
        setGameResult(null);
        setScenePhase(domain.app.ScenePhase.PLAYING);
      },

      handleGameResult: (payload: GameResultPayload) => {
        setGameResult(payload);
        setScenePhase(domain.app.ScenePhase.RESULT);
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
  }, [completeJoinRequest, setGameResult, setMyId, setRoom, setScenePhase]);
};
