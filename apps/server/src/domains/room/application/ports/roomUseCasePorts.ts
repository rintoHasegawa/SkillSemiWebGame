/**
 * roomUseCasePorts
 * ルームユースケースが依存する操作ポートを定義する
 */
import type { roomTypes } from "@repo/shared";

/** ルーム参加ユースケースが利用する参加操作ポート */
export interface JoinRoomPort {
  addPlayerToRoom(roomId: string, socketId: string, playerName: string): roomTypes.Room;
}

/** ルーム切断ユースケースが利用する退出操作ポート */
export interface DisconnectRoomPort {
  removePlayer(socketId: string): roomTypes.Room[];
}
