/**
 * room.type
 * ルーム領域で利用する共有型を定義する
 * 参加状態とイベントペイロード契約を集約する
 */

import type { FieldSizePreset } from "../../config/gameConfig";

/** ルーム進行フェーズ状態型 */
export type RoomPhase = "waiting" | "playing" | "result";

/** ルーム所属プレイヤー情報 */
export interface RoomMember {
  id: string;
  name: string;
  isOwner: boolean;
  isReady: boolean;
}

/** ルーム全体状態データ */
export interface Room {
  roomId: string;
  ownerId: string;
  players: RoomMember[];
  status: RoomPhase;
  maxPlayers: number;
  fieldSizePreset: FieldSizePreset;
}

/** ルーム参加時に送信するペイロード */
export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
}

/** ルーム参加拒否理由 */
export type JoinRoomRejectedReason = "full" | "duplicate" | "playing";

/** ルーム参加拒否通知ペイロード */
export interface JoinRoomRejectedPayload {
  roomId: string;
  reason: JoinRoomRejectedReason;
}