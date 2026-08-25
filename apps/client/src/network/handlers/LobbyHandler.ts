/**
 * LobbyHandler
 * ロビー画面で利用するソケット購読と送信を扱うハンドラ
 * ルーム更新購読とゲーム開始要求送信を提供する
 * 明示退室と，一時的な切断からの試合復帰要求・復帰結果の購読も扱う
 */
import type { Socket } from "socket.io-client";
import { contracts as protocol } from "@repo/shared";
import type {
  LobbySettingsUpdatePayload,
  ResumeSessionRejectedPayload,
  SelectTeamPayload,
  SelectTeamRejectedPayload,
  ServerToClientPayloadOf,
  SessionResumedPayload,
  StartGameRequestPayload,
} from "@repo/shared";
import { createClientSocketEventBridge } from "./socketEventBridge";

/** ロビー画面で利用する通信操作の契約 */
type LobbyHandler = {
  onRoomUpdate: (
    callback: (
      room: ServerToClientPayloadOf<typeof protocol.SocketEvents.ROOM_UPDATE>,
    ) => void,
  ) => void;
  onceRoomUpdate: (
    callback: (
      room: ServerToClientPayloadOf<typeof protocol.SocketEvents.ROOM_UPDATE>,
    ) => void,
  ) => void;
  offRoomUpdate: (
    callback: (
      room: ServerToClientPayloadOf<typeof protocol.SocketEvents.ROOM_UPDATE>,
    ) => void,
  ) => void;
  startGame: (payload?: StartGameRequestPayload) => void;
  updateLobbySettings: (payload: LobbySettingsUpdatePayload) => void;
  selectTeam: (payload: SelectTeamPayload) => void;
  onSelectTeamRejected: (callback: (payload: SelectTeamRejectedPayload) => void) => void;
  offSelectTeamRejected: (callback: (payload: SelectTeamRejectedPayload) => void) => void;
  leaveRoom: () => void;
  resumeSession: () => void;
  onSessionResumed: (callback: (payload: SessionResumedPayload) => void) => void;
  offSessionResumed: (callback: (payload: SessionResumedPayload) => void) => void;
  onResumeSessionRejected: (
    callback: (payload: ResumeSessionRejectedPayload) => void,
  ) => void;
  offResumeSessionRejected: (
    callback: (payload: ResumeSessionRejectedPayload) => void,
  ) => void;
};

/** ロビー画面向けのソケットハンドラを生成する */
export const createLobbyHandler = (socket: Socket): LobbyHandler => {
  const { onEvent, onceEvent, offEvent, emitEvent } =
    createClientSocketEventBridge(socket);

  return {
    onRoomUpdate: (callback) => {
      onEvent(protocol.SocketEvents.ROOM_UPDATE, callback);
    },
    onceRoomUpdate: (callback) => {
      onceEvent(protocol.SocketEvents.ROOM_UPDATE, callback);
    },
    offRoomUpdate: (callback) => {
      offEvent(protocol.SocketEvents.ROOM_UPDATE, callback);
    },
    startGame: (payload) => {
      emitEvent(protocol.SocketEvents.START_GAME, payload ?? {});
    },
    updateLobbySettings: (payload) => {
      emitEvent(protocol.SocketEvents.LOBBY_SETTINGS_UPDATE, payload);
    },
    selectTeam: (payload) => {
      emitEvent(protocol.SocketEvents.SELECT_TEAM, payload);
    },
    onSelectTeamRejected: (callback) => {
      onEvent(protocol.SocketEvents.SELECT_TEAM_REJECTED, callback);
    },
    offSelectTeamRejected: (callback) => {
      offEvent(protocol.SocketEvents.SELECT_TEAM_REJECTED, callback);
    },
    leaveRoom: () => {
      // ペイロードを持たないため引数を渡さずに送出する
      emitEvent(protocol.SocketEvents.LEAVE_ROOM);
    },
    resumeSession: () => {
      // 復帰用トークンはハンドシェイクで提示済みのためペイロードは無い
      emitEvent(protocol.SocketEvents.RESUME_SESSION);
    },
    onSessionResumed: (callback) => {
      onEvent(protocol.SocketEvents.SESSION_RESUMED, callback);
    },
    offSessionResumed: (callback) => {
      offEvent(protocol.SocketEvents.SESSION_RESUMED, callback);
    },
    onResumeSessionRejected: (callback) => {
      onEvent(protocol.SocketEvents.RESUME_SESSION_REJECTED, callback);
    },
    offResumeSessionRejected: (callback) => {
      offEvent(protocol.SocketEvents.RESUME_SESSION_REJECTED, callback);
    },
  };
};

/** ロビー画面向けの通信ハンドラ型を再公開 */
export type { LobbyHandler };
