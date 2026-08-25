/**
 * useSocketSubscriptions
 * アプリ共通で必要なソケット購読を登録するフック
 * 接続，ルーム更新，ゲーム開始の購読と解除を一元化する
 * プロトコル版不一致は自動復旧を試み，解消しない場合のみ画面へ通知する
 * プレイ中の再接続では席への復帰を要求し，結果をアプリフローへ反映する
 */
import { useEffect, type RefObject } from "react";
import { socketManager } from "@client/network/SocketManager";
import {
  applyRuntimeMapSizeFromGameStart,
  setRuntimeMapSizeByPreset,
} from "@client/config";
import { domain } from "@repo/shared";
import type {
  GameResultPayload,
  GameStartPayload,
  ResumeSessionRejectedPayload,
  SessionResumedPayload,
} from "@repo/shared";
import { recoverFromProtocolVersionMismatch } from "@client/pwa/appUpdater";
import {
  shouldAcceptGameStart,
  shouldAcceptRoomUpdate,
  type RoomMembership,
} from "./application/roomEventGuards";
import type { AppFlowAction } from "./types/appFlowState";

/** 再接続要求の判定に用いる最新の画面・復帰状態 */
export type ReconnectStatus = {
  scenePhase: domain.app.ScenePhaseType;
  /** プレイ中の切断から席への復帰を待っている最中か */
  isReconnecting: boolean;
};

type UseSocketSubscriptionsParams = {
  completeJoinRequest: () => void;
  dispatchAppFlow: (action: AppFlowAction) => void;
  scenePhase: domain.app.ScenePhaseType;
  /**
   * 自分の所属ルーム状態への参照
   * 購読を張り直さずに最新値を読むため ref で受け取る
   */
  membershipRef: RefObject<RoomMembership>;
  /**
   * 再接続状態への参照
   * connect は購読登録時に同期発火しうるため，クロージャではなく ref で最新値を読む
   */
  reconnectRef: RefObject<ReconnectStatus>;
};

type AppSocketHandlers = {
  handleConnect: (id: string) => void;
  handleDisconnect: () => void;
  handleRoomUpdate: (updatedRoom: domain.room.Room) => void;
  handleGameStart: (payload: GameStartPayload) => void;
  handleGameResult: (payload: GameResultPayload) => void;
  handleSessionResumed: (payload: SessionResumedPayload) => void;
  handleResumeSessionRejected: (payload: ResumeSessionRejectedPayload) => void;
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
  handleSessionResumed,
  handleResumeSessionRejected,
}: AppSocketHandlers): void => {
  socketManager.lobby.onRoomUpdate(handleRoomUpdate);
  socketManager.lobby.onSessionResumed(handleSessionResumed);
  socketManager.lobby.onResumeSessionRejected(handleResumeSessionRejected);
};

const unregisterRoomSubscriptions = ({
  handleRoomUpdate,
  handleSessionResumed,
  handleResumeSessionRejected,
}: AppSocketHandlers): void => {
  socketManager.lobby.offRoomUpdate(handleRoomUpdate);
  socketManager.lobby.offSessionResumed(handleSessionResumed);
  socketManager.lobby.offResumeSessionRejected(handleResumeSessionRejected);
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
  reconnectRef,
}: UseSocketSubscriptionsParams): void => {
  useEffect(() => {
    const handlers: AppSocketHandlers = {
      handleConnect: (id: string) => {
        // socket.id 未確定時は採用しない
        if (id === "") {
          return;
        }

        dispatchAppFlow({ type: "connectionEstablished", myId: id });

        // 購読登録時の同期発火でも誤判定しないよう ref から最新状態を読む
        const reconnectStatus = reconnectRef.current;
        if (
          reconnectStatus.scenePhase !== domain.app.ScenePhase.PLAYING ||
          !reconnectStatus.isReconnecting
        ) {
          return;
        }

        // プレイ中の切断からの再接続では，予約済みの席へ戻ることを要求する
        socketManager.lobby.resumeSession();
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
        // 試合終了後は席と復帰予約を残さないよう明示的に退室する（切断はしない）
        socketManager.lobby.leaveRoom();
      },

      handleSessionResumed: (payload: SessionResumedPayload) => {
        dispatchAppFlow({
          type: "sessionResumed",
          playerId: payload.playerId,
          room: payload.room,
        });
      },

      handleResumeSessionRejected: (payload: ResumeSessionRejectedPayload) => {
        dispatchAppFlow({ type: "resumeRejected", reason: payload.reason });
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
