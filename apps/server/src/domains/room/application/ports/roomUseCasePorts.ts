/**
 * roomUseCasePorts
 * ルームユースケースが依存する操作ポートを定義する
 */
import type { roomTypes } from "@repo/shared";
import type {
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
  & DisconnectPlayerPort;

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

/** ゲーム開始調停で利用するオーナー所属ルーム参照ポート */
export interface FindRoomByOwnerPort {
  getRoomByOwnerId(ownerId: string): roomTypes.Room | undefined;
}

/** ゲーム開始調停で利用するルーム状態遷移ポート */
export interface RoomPhaseTransitionPort {
  markRoomPlaying(roomId: string): roomTypes.Room | undefined;
  markRoomWaiting(roomId: string): roomTypes.Room | undefined;
}

/** ルームIDでの存在確認に利用する参照ポート */
export interface FindRoomByIdPort {
  getRoomById(roomId: string): roomTypes.Room | undefined;
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

/** START_GAME調停で利用する依存集合 */
export type StartGameDeps = {
  roomManager: FindRoomByOwnerPort & RoomPhaseTransitionPort;
  runtimeRegistry: FindGameByRoomPort;
};

/** READY_FOR_GAME調停で利用する依存集合 */
export type ReadyForGameDeps = {
  roomManager: FindRoomByPlayerPort;
  runtimeRegistry: FindGameByPlayerPort;
};

/** DISCONNECT調停で利用する依存集合 */
export type DisconnectDeps = {
  roomManager: DisconnectRoomPort & FindRoomByPlayerPort & FindRoomByIdPort;
  runtimeRegistry: FindGameByPlayerPort & CleanupGameRuntimePort;
};
