/**
 * useSocketSubscriptions
 * アプリ共通で必要なソケット購読を登録するフック
 * 接続，ルーム更新，ゲーム開始の購読と解除を一元化する
 */
import { useEffect } from "react";
import { socketManager } from "@client/network/SocketManager";
import { appConsts } from "@repo/shared";
import type { appTypes, roomTypes, GameResultPayload } from "@repo/shared";

type UseSocketSubscriptionsParams = {
  completeJoinRequest: () => void;
  setGameResult: (payload: GameResultPayload | null) => void;
  setMyId: (id: string | null) => void;
  setRoom: (room: roomTypes.Room | null) => void;
  setScenePhase: (phase: appTypes.ScenePhase) => void;
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
    const handleConnect = (id: string) => {
      setMyId(id);
    };

    const handleRoomUpdate = (updatedRoom: roomTypes.Room) => {
      completeJoinRequest();
      setRoom(updatedRoom);
      setScenePhase(appConsts.ScenePhase.LOBBY);
    };

    const handleGameStart = () => {
      setGameResult(null);
      setScenePhase(appConsts.ScenePhase.PLAYING);
    };

    const handleGameResult = (payload: GameResultPayload) => {
      setGameResult(payload);
      setScenePhase(appConsts.ScenePhase.RESULT);
    };

    socketManager.common.onConnect(handleConnect);
    socketManager.lobby.onRoomUpdate(handleRoomUpdate);
    socketManager.game.onceGameStart(handleGameStart);
    socketManager.game.onGameResult(handleGameResult);

    return () => {
      completeJoinRequest();
      socketManager.common.offConnect(handleConnect);
      socketManager.lobby.offRoomUpdate(handleRoomUpdate);
      socketManager.game.offGameResult(handleGameResult);
    };
  }, [completeJoinRequest, setGameResult, setMyId, setRoom, setScenePhase]);
};
