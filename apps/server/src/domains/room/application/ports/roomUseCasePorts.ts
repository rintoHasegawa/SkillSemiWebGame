/**
 * roomUseCasePorts
 * ルームユースケースが依存する操作ポートを定義する
 */
import { domain } from "@repo/shared";
import type {
  ResumeSessionRejectedPayload,
  SessionResumedPayload,
} from "@repo/shared";
import type {
  ActiveBombQueryPort,
  BombHitReportValidationPort,
  BombHitStatsPort,
  BombPlacementPort,
  DisconnectPlayerPort,
  MovePlayerPort,
  ReadyForGamePort,
  ResumePlayerPort,
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
  & DisconnectPlayerPort
  & ResumePlayerPort;

/** ルーム参加処理の実行結果 */
export type JoinRoomResult = {
  room: domain.room.Room;
  status: "joined" | "duplicate" | "full" | "playing";
};

/** ルームユースケースが利用する出力ポート */
export interface RoomOutputPort {
  publishRoomUpdateToRoom(roomId: domain.room.Room["roomId"], room: domain.room.Room): void;
  publishJoinRejectedToSocket(payload: domain.room.JoinRoomRejectedPayload): void;
  publishSelectTeamRejectedToSocket(teamId: number): void;
  /** 試合復帰の受理をソケットへ通知する */
  publishSessionResumedToSocket(payload: SessionResumedPayload): void;
  /** 試合復帰の拒否理由をソケットへ通知する */
  publishResumeSessionRejectedToSocket(
    reason: ResumeSessionRejectedPayload["reason"],
  ): void;
  /** ルーム削除時に配信チャンネルを閉じ，在室ソケットを退出させる */
  closeRoomChannel(roomId: domain.room.Room["roomId"]): void;
}

/** ルーム参加ユースケースが利用する参加操作ポート */
export interface JoinRoomPort {
  addPlayerToRoom(roomId: string, socketId: string, playerName: string): JoinRoomResult;
}

/** 復席させるプレイヤーの在籍情報 */
export type RestorePlayerParams = {
  roomId: string;
  playerId: string;
  playerName: string;
  /** 復席時に戻すチームID（UNKNOWN_TEAM_ID の場合は希望チーム未設定として扱う） */
  teamId: number;
};

/** 復席処理の実行結果 */
export type RestorePlayerResult =
  | { status: "restored"; room: domain.room.Room }
  | { status: "not_found" };

/** 試合復帰ユースケースが利用する復席操作ポート */
export interface RestorePlayerToRoomPort {
  restorePlayerToRoom(params: RestorePlayerParams): RestorePlayerResult;
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
export type RoomPhaseTransitionResult =
  | { status: "updated"; room: domain.room.Room }
  | { status: "not_found" }
  | { status: "invalid_transition" };

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
    teamAssignmentMode: domain.room.Room["teamAssignmentMode"],
  ): domain.room.Room | undefined;
}

/** ゲーム開始時に確定したフィールドサイズを反映する操作ポート */
export interface ApplyFieldSizePresetPort {
  applyFieldSizePreset(
    roomId: string,
    fieldSizePreset: domain.room.Room["fieldSizePreset"],
  ): domain.room.Room | undefined;
}

/** チーム選択の結果 */
export type SelectTeamResult =
  | { status: "ok"; room: domain.room.Room }
  | { status: "team_full"; teamId: number }
  | { status: "invalid_team" }
  | { status: "not_found" };

/** チーム選択操作ポート */
export interface SelectTeamPort {
  selectTeam(
    playerId: string,
    preferredTeamId: domain.room.RoomMember["preferredTeamId"],
  ): SelectTeamResult;
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
