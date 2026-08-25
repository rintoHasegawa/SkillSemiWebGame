/**
 * lobbyEventPayloadMap
 * ロビー関連イベントのペイロード対応表を定義する
 * ルーム参加要求と拒否通知，ルーム更新契約に加え，退室と試合復帰の契約を集約する
 */
import { SocketEvents } from "../socketEvents";
import type {
  JoinRoomPayload,
  LobbySettingsUpdatePayload,
  ResumeSessionRejectedPayload,
  RoomJoinRejectedPayload,
  RoomUpdatePayload,
  SelectTeamPayload,
  SelectTeamRejectedPayload,
  SessionResumedPayload,
} from "../payloads/lobbyPayloads";

/** ロビー関連のクライアント送信イベントペイロード対応表 */
export type LobbyClientToServerEventPayloadMap = {
  [SocketEvents.JOIN_ROOM]: JoinRoomPayload;
  [SocketEvents.LOBBY_SETTINGS_UPDATE]: LobbySettingsUpdatePayload;
  [SocketEvents.SELECT_TEAM]: SelectTeamPayload;
  [SocketEvents.LEAVE_ROOM]: undefined;
  [SocketEvents.RESUME_SESSION]: undefined;
};

/** ロビー関連のサーバー送信イベントペイロード対応表 */
export type LobbyServerToClientEventPayloadMap = {
  [SocketEvents.ROOM_JOIN_REJECTED]: RoomJoinRejectedPayload;
  [SocketEvents.ROOM_UPDATE]: RoomUpdatePayload;
  [SocketEvents.SELECT_TEAM_REJECTED]: SelectTeamRejectedPayload;
  [SocketEvents.SESSION_RESUMED]: SessionResumedPayload;
  [SocketEvents.RESUME_SESSION_REJECTED]: ResumeSessionRejectedPayload;
};
