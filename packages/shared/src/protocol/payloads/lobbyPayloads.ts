/**
 * lobbyPayloads
 * ロビー関連イベントで利用するペイロード型を定義する
 * ルーム参加前後の契約を共有する
 */
import type * as roomTypes from "../../domains/room/room.type";
/** チーム割り当て方式をロビー契約の一部として再公開 */
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

/** SESSION_RESUMED イベントでサーバーが送信する試合復帰情報 */
export type SessionResumedPayload = {
  /** 復帰後に自分を識別するためのプレイヤーID（切断前のIDを引き継ぐ） */
  playerId: string;
  /** 復帰したルームの最新状態 */
  room: roomTypes.Room;
};

/** RESUME_SESSION_REJECTED イベントでサーバーが送信する復帰拒否情報 */
export type ResumeSessionRejectedPayload = {
  /**
   * 拒否理由
   * expired は予約が見つからない場合，game_ended は予約はあるが
   * ゲームランタイムを解決できない場合を表す
   */
  reason: "expired" | "game_ended";
};
