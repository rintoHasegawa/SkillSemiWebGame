/**
 * lobbyPayloads
 * ロビー関連イベントで利用するペイロード型を定義する
 * ルーム参加前後の契約を共有する
 */
import type * as roomTypes from "../../domains/room/room.type";

/** JOIN_ROOM イベントで送受信するルーム参加情報 */
export type JoinRoomPayload = roomTypes.JoinRoomPayload;

/** ROOM_JOIN_REJECTED イベントで送受信する参加拒否情報 */
export type RoomJoinRejectedPayload = roomTypes.JoinRoomRejectedPayload;

/** ROOM_UPDATE イベントで送受信するルーム状態情報 */
export type RoomUpdatePayload = roomTypes.Room;
