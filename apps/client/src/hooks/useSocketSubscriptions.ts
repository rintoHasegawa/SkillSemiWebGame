/**
 * useSocketSubscriptions
 * アプリ共通で必要なソケット購読を登録するフック
 * 接続，ルーム更新，ゲーム開始の購読と解除を一元化する
 * プロトコル版不一致は自動復旧を試み，解消しない場合のみ画面へ通知する
 */
import { useEffect, type RefObject } from "react";
import { socketManager } from "@client/network/SocketManager";
import {
  applyRuntimeMapSizeFromGameStart,
  setRuntimeMapSizeByPreset,
} from "@client/config";
import { domain } from "@repo/shared";
import type { GameResultPayload, GameStartPayload } from "@repo/shared";
import { recoverFromProtocolVersionMismatch } from "@client/pwa/appUpdater";
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
  handleProtocolVersionMismatch: () => void;
};

const registerConnectionSubscriptions = ({
  handleConnect,
  handleDisconnect,
  handleProtocolVersionMismatch,
}: AppSocketHandlers): void => {
  socketManager.common.onConnect(handleConnect);
  socketManager.common.onDisconnect(handleDisconnect);
  socketManager.common.onProtocolVersionMismatch(handleProtocolVersionMismatch);
};

const unregisterConnectionSubscriptions = ({
  handleConnect,
  handleDisconnect,
  handleProtocolVersionMismatch,
}: AppSocketHandlers): void => {
  socketManager.common.offConnect(handleConnect);
  socketManager.common.offDisconnect(handleDisconnect);
  socketManager.common.offProtocolVersionMismatch(
    handleProtocolVersionMismatch,
  );
};

// 版ずれの自動復旧を試み，解消しなかった場合のみ画面へ理由を通知する
const recoverOrNotifyProtocolMismatch = async (
  dispatchAppFlow: (action: AppFlowAction) => void,
): Promise<void> => {
  try {
    const isRecovering = await recoverFromProtocolVersionMismatch();

    // 更新適用またはリロードが始まっている場合は画面通知を出さない
    if (isRecovering) {
      return;
    }
  } catch (error) {
    console.error(
      "[useSocketSubscriptions] プロトコル版不一致の復旧に失敗した",
      error,
    );
  }

  dispatchAppFlow({ type: "protocolVersionMismatch" });
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

      handleProtocolVersionMismatch: () => {
        // 拒否は connect_error として再接続のたびに届くため先に試行を止める
        socketManager.socket.disconnect();

        void recoverOrNotifyProtocolMismatch(dispatchAppFlow);
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
