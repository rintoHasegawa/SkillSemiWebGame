/**
 * useSocketSubscriptions
 * アプリ共通で必要なソケット購読を登録するフック
 * 接続，ルーム更新，ゲーム開始の購読と解除を一元化する
 */
import { useEffect, type RefObject } from "react";
import { socketManager } from "@client/network/SocketManager";
import {
  applyRuntimeMapSizeFromGameStart,
  setRuntimeMapSizeByPreset,
} from "@client/config";
import { domain } from "@repo/shared";
import type { GameResultPayload, GameStartPayload } from "@repo/shared";
import {
  shouldAcceptGameStart,
  shouldAcceptRoomUpdate,
  type RoomMembership,
} from "./application/roomEventGuards";
import type { AppFlowAction } from "./types/appFlowState";

type UseSocketSubscriptionsParams = {
  completeJoinRequest: () => void;
  dispatchAppFlow: (action: AppFlowAction) => void;
  scenePhase: domain.app.ScenePhaseType;
  /**
   * 自分の所属ルーム状態への参照
   * 購読を張り直さずに最新値を読むため ref で受け取る
   */
  membershipRef: RefObject<RoomMembership>;
};

type AppSocketHandlers = {
  handleConnect: (id: string) => void;
  handleDisconnect: () => void;
  handleRoomUpdate: (updatedRoom: domain.room.Room) => void;
  handleGameStart: (payload: GameStartPayload) => void;
  handleGameResult: (payload: GameResultPayload) => void;
};

const registerConnectionSubscriptions = ({
  handleConnect,
  handleDisconnect,
}: AppSocketHandlers): void => {
  socketManager.common.onConnect(handleConnect);
  socketManager.common.onDisconnect(handleDisconnect);
};

const unregisterConnectionSubscriptions = ({
  handleConnect,
  handleDisconnect,
}: AppSocketHandlers): void => {
  socketManager.common.offConnect(handleConnect);
  socketManager.common.offDisconnect(handleDisconnect);
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
  membershipRef,
}: UseSocketSubscriptionsParams): void => {
  useEffect(() => {
    const handlers: AppSocketHandlers = {
      handleConnect: (id: string) => {
        // socket.id 未確定時は採用しない
        if (id === "") {
          return;
        }

        dispatchAppFlow({ type: "connectionEstablished", myId: id });
      },

      handleDisconnect: () => {
        // 意図的な切断かどうかの判定は reducer 側のフェーズ判定に委ねる
        dispatchAppFlow({ type: "connectionLost" });
      },

      handleRoomUpdate: (updatedRoom: domain.room.Room) => {
        // 所属外ルームの更新で参加フローやマップ設定を書き換えないよう副作用の前に弾く
        const membership = membershipRef.current;
        if (!shouldAcceptRoomUpdate({ membership, updatedRoom })) {
          console.error(
            "[useSocketSubscriptions] 所属外ルームの ROOM_UPDATE を無視した",
            {
              currentRoomId: membership.currentRoomId,
              myId: membership.myId,
              receivedRoomId: updatedRoom.roomId,
            },
          );
          return;
        }

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
        // 所属外ルームのゲーム開始でマップ設定とシーンが引きずられないよう弾く
        const membership = membershipRef.current;
        if (!shouldAcceptGameStart({ membership, payload })) {
          console.error(
            "[useSocketSubscriptions] 所属外ルームの GAME_START を無視した",
            {
              currentRoomId: membership.currentRoomId,
              myId: membership.myId,
              receivedRoomId: payload.roomId,
            },
          );
          return;
        }

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
