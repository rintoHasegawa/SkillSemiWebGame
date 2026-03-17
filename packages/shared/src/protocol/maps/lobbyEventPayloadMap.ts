/**
 * lobbyEventPayloadMap
 * ロビー関連イベントのペイロード対応表を定義する
 * ルーム参加要求と拒否通知，ルーム更新契約を集約する
 */
import { SocketEvents } from "../socketEvents";
import type {
  JoinRoomPayload,
  LobbySettingsUpdatePayload,
  RoomJoinRejectedPayload,
  RoomUpdatePayload,
} from "../payloads/lobbyPayloads";

/** ロビー関連のクライアント送信イベントペイロード対応表 */
export type LobbyClientToServerEventPayloadMap = {
  [SocketEvents.JOIN_ROOM]: JoinRoomPayload;
  [SocketEvents.LOBBY_SETTINGS_UPDATE]: LobbySettingsUpdatePayload;
};

/** ロビー関連のサーバー送信イベントペイロード対応表 */
export type LobbyServerToClientEventPayloadMap = {
  [SocketEvents.ROOM_JOIN_REJECTED]: RoomJoinRejectedPayload;
  [SocketEvents.ROOM_UPDATE]: RoomUpdatePayload;
};
