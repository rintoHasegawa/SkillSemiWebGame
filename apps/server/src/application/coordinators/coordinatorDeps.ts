/**
 * coordinatorDeps
 * コーディネータが利用する依存束ね型を定義する
 */
import type {
  CleanupGameRuntimePort,
  DisconnectRoomPort,
  FindGameByPlayerPort,
  FindGameByRoomPort,
  FindRoomByIdPort,
  FindRoomByOwnerPort,
  FindRoomByPlayerPort,
  RoomPhaseTransitionPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";

/** START_GAME調停で利用する依存集合 */
export type StartGameCoordinatorDeps = {
  roomManager: FindRoomByOwnerPort & RoomPhaseTransitionPort;
  runtimeRegistry: FindGameByRoomPort;
};

/** READY_FOR_GAME調停で利用する依存集合 */
export type ReadyForGameCoordinatorDeps = {
  roomManager: FindRoomByPlayerPort;
  runtimeRegistry: FindGameByPlayerPort;
};

/** DISCONNECT調停で利用する依存集合 */
export type DisconnectCoordinatorDeps = {
  roomManager: DisconnectRoomPort & FindRoomByPlayerPort & FindRoomByIdPort;
  runtimeRegistry: FindGameByPlayerPort & CleanupGameRuntimePort;
};
