/**
 * coordinatorDeps
 * コーディネータが利用する依存束ね型を定義する
 */
import type {
  ApplyFieldSizePresetPort,
  CleanupGameRuntimePort,
  DeleteRoomPort,
  DisconnectRoomPort,
  FindGameByRoomPort,
  FindRoomByIdPort,
  FindRoomByOwnerPort,
  RestorePlayerToRoomPort,
  RoomPhaseTransitionPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import type { CoordinatorRuntimeDeps } from "./runtimeCoordinatorSupport";

/** 復帰予約として保持するプレイヤーの在籍情報 */
export type SessionReservation = {
  playerId: string;
  roomId: string;
  playerName: string;
  teamId: number;
};

/** 復帰予約を取り出して破棄する操作ポート */
export interface ConsumeSessionReservationPort {
  consume(token: string): SessionReservation | undefined;
}

/** ルーム単位で復帰予約を解放する操作ポート */
export interface ReleaseRoomSessionReservationPort {
  releaseByRoomId(roomId: string): void;
}

/** ソケットへプレイヤーIDを結び付ける操作ポート */
export interface BindPlayerIdentityPort {
  bind(socketId: string, playerId: string): void;
}

/** START_GAME調停で利用する依存集合 */
export type StartGameCoordinatorDeps = {
  roomManager:
    & FindRoomByOwnerPort
    & RoomPhaseTransitionPort
    & ApplyFieldSizePresetPort
    & DeleteRoomPort;
  runtimeRegistry: FindGameByRoomPort & CleanupGameRuntimePort;
};

/** READY_FOR_GAME調停で利用する依存集合 */
export type ReadyForGameCoordinatorDeps = CoordinatorRuntimeDeps;

/** RESUME_SESSION調停で利用する依存集合 */
export type ResumeSessionCoordinatorDeps = {
  roomManager: RestorePlayerToRoomPort;
  runtimeRegistry: FindGameByRoomPort;
  sessionReservations: ConsumeSessionReservationPort;
  identityRegistry: BindPlayerIdentityPort;
};

/** DISCONNECT調停で利用する依存集合 */
export type DisconnectCoordinatorDeps = {
  roomManager: DisconnectRoomPort & CoordinatorRuntimeDeps["roomManager"] & FindRoomByIdPort;
  runtimeRegistry: CoordinatorRuntimeDeps["runtimeRegistry"] & CleanupGameRuntimePort;
};
