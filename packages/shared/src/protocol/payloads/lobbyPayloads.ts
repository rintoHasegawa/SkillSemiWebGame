/**
 * lobbyPayloads
 * ロビー関連イベントで利用するペイロード型を定義する
 * ルーム参加前後の契約を共有する
 */
import type * as roomTypes from "../../domains/room/room.type";
export type { TeamAssignmentMode } from "../../domains/room/room.type";

/** JOIN_ROOM イベントで送受信するルーム参加情報 */
export type JoinRoomPayload = roomTypes.JoinRoomPayload;

/** ROOM_JOIN_REJECTED イベントで送受信する参加拒否情報 */
export type RoomJoinRejectedPayload = roomTypes.JoinRoomRejectedPayload;

/** ROOM_UPDATE イベントで送受信するルーム状態情報 */
export type RoomUpdatePayload = roomTypes.Room;

/** LOBBY_SETTINGS_UPDATE イベントでホストが送信するロビー設定情報 */
export type LobbySettingsUpdatePayload = {
  targetPlayerCount: number;
  fieldSizePreset: roomTypes.Room["fieldSizePreset"];
  teamAssignmentMode: roomTypes.TeamAssignmentMode;
};

/** SELECT_TEAM イベントでプレイヤーが送信するチーム選択情報 */
export type SelectTeamPayload = {
  /** 選択したチームID（null = ランダム割り当て） */
  preferredTeamId: number | null;
};

/** SELECT_TEAM_REJECTED イベントでサーバーが送信するチーム選択拒否情報 */
export type SelectTeamRejectedPayload = {
  /** 拒否されたチームID */
  preferredTeamId: number;
  /** 拒否理由 */
  reason: "team_full";
};
