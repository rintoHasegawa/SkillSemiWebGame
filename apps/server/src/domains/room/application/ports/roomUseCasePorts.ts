/**
 * roomUseCasePorts
 * ルームユースケースが依存する操作ポートを定義する
 */
import type { roomTypes } from "@repo/shared";

/** ルーム参加処理の実行結果 */
export type JoinRoomResult = {
  room: roomTypes.Room;
  status: "joined" | "duplicate" | "full";
};

/** ルームユースケースが利用する出力ポート */
export interface RoomOutputPort {
  publishRoomUpdateToRoom(roomId: roomTypes.Room["roomId"], room: roomTypes.Room): void;
  publishJoinRejectedToSocket(payload: roomTypes.JoinRoomRejectedPayload): void;
}

/** ルーム参加ユースケースが利用する参加操作ポート */
export interface JoinRoomPort {
  addPlayerToRoom(roomId: string, socketId: string, playerName: string): JoinRoomResult;
}

/** ルーム切断ユースケースが利用する退出操作ポート */
export interface DisconnectRoomPort {
  removePlayer(socketId: string): roomTypes.Room[];
}

/** 切断調停で利用するプレイヤー所属ルーム参照ポート */
export interface FindRoomByPlayerPort {
  getRoomByPlayerId(playerId: string): roomTypes.Room | undefined;
}
