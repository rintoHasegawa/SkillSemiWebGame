/**
 * roomUseCasePorts
 * ルームユースケースが依存する操作ポートを定義する
 */
import { domain } from "@repo/shared";
import type {
  ActiveBombQueryPort,
  BombHitReportValidationPort,
  BombHitStatsPort,
  BombPlacementPort,
  DisconnectPlayerPort,
  MovePlayerPort,
  ReadyForGamePort,
  StartGamePort,
} from "@server/domains/game/application/ports/gameUseCasePorts";

/** ルーム単位ゲーム管理が満たす操作ポート集合 */
export type RoomScopedGamePort =
  & StartGamePort
  & ReadyForGamePort
  & MovePlayerPort
  & BombPlacementPort
  & ActiveBombQueryPort
  & BombHitReportValidationPort
  & BombHitStatsPort
  & DisconnectPlayerPort;

/** ルーム参加処理の実行結果 */
export type JoinRoomResult = {
  room: domain.room.Room;
  status: "joined" | "duplicate" | "full" | "playing";
};

/** ルームユースケースが利用する出力ポート */
export interface RoomOutputPort {
  publishRoomUpdateToRoom(roomId: domain.room.Room["roomId"], room: domain.room.Room): void;
  publishJoinRejectedToSocket(payload: domain.room.JoinRoomRejectedPayload): void;
}

/** ルーム参加ユースケースが利用する参加操作ポート */
export interface JoinRoomPort {
  addPlayerToRoom(roomId: string, socketId: string, playerName: string): JoinRoomResult;
}

/** ルーム切断ユースケースが利用する退出操作ポート */
export interface DisconnectRoomPort {
  removePlayer(socketId: string): RoomDisconnectResult;
}

/** 退出処理で更新対象となったルーム情報 */
export type RoomDisconnectResult = {
  updatedRooms: domain.room.Room[];
  deletedRoomIds: string[];
};

/** 切断調停で利用するプレイヤー所属ルーム参照ポート */
export interface FindRoomByPlayerPort {
  getRoomByPlayerId(playerId: string): domain.room.Room | undefined;
}

/** ゲーム開始調停で利用するオーナー所属ルーム参照ポート */
export interface FindRoomByOwnerPort {
  getRoomByOwnerId(ownerId: string): domain.room.Room | undefined;
}

/** ゲーム開始調停で利用するルーム状態遷移ポート */
export interface RoomPhaseTransitionPort {
  markRoomPlaying(roomId: string): RoomPhaseTransitionResult;
  markRoomWaiting(roomId: string): RoomPhaseTransitionResult;
}

/** ルーム状態遷移の実行結果 */
export type RoomPhaseTransitionResult = {
  status: "updated" | "not_found" | "invalid_transition";
  room?: domain.room.Room;
};

/** ルームIDでの存在確認に利用する参照ポート */
export interface FindRoomByIdPort {
  getRoomById(roomId: string): domain.room.Room | undefined;
}

/** ゲーム終了時にルームを削除する操作ポート */
export interface DeleteRoomPort {
  deleteRoom(roomId: string): boolean;
}

/** ロビー設定更新操作ポート */
export interface UpdateLobbySettingsPort {
  updateLobbySettings(
    roomId: string,
    targetPlayerCount: number,
    fieldSizePreset: domain.room.Room["fieldSizePreset"],
  ): domain.room.Room | undefined;
}

/** ルーム参加後にゲームランタイムを確保する操作ポート */
export interface EnsureGameRuntimePort {
  ensureGameManagerForRoom(roomId: string): void;
}

/** ルーム解散後に不要ランタイムを破棄する操作ポート */
export interface CleanupGameRuntimePort {
  cleanupGameManagerForRoom(roomId: string): void;
}

/** ルームIDでゲーム管理を解決する参照ポート */
export interface FindGameByRoomPort {
  getGameManagerByRoomId(roomId: string): RoomScopedGamePort | undefined;
}

/** プレイヤーIDでゲーム管理を解決する参照ポート */
export interface FindGameByPlayerPort {
  getGameManagerByPlayerId(playerId: string): RoomScopedGamePort | undefined;
}
