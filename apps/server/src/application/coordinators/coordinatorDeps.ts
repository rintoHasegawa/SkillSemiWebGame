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
  RoomPhaseTransitionPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import type { CoordinatorRuntimeDeps } from "./runtimeCoordinatorSupport";

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

/** DISCONNECT調停で利用する依存集合 */
export type DisconnectCoordinatorDeps = {
  roomManager: DisconnectRoomPort & CoordinatorRuntimeDeps["roomManager"] & FindRoomByIdPort;
  runtimeRegistry: CoordinatorRuntimeDeps["runtimeRegistry"] & CleanupGameRuntimePort;
};
