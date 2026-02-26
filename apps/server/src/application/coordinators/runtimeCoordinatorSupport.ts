/**
 * runtimeCoordinatorSupport
 * コーディネータ層のランタイム解決処理を共通化する
 */
import type {
  FindGameByPlayerPort,
  FindRoomByPlayerPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import {
  resolveRuntimeByPlayerId,
  type RuntimeByPlayerResolution,
} from "@server/domains/room/application/services/RoomRuntimeResolver";

/** コーディネータで利用するランタイム解決依存集合 */
export type CoordinatorRuntimeDeps = {
  roomManager: FindRoomByPlayerPort;
  runtimeRegistry: FindGameByPlayerPort;
};

/** コーディネータ向けにプレイヤーID起点ランタイムを解決する */
export const resolveCoordinatorRuntime = (
  deps: CoordinatorRuntimeDeps,
  socketId: string,
): RuntimeByPlayerResolution | undefined => {
  return resolveRuntimeByPlayerId(
    deps.roomManager,
    deps.runtimeRegistry,
    socketId,
  );
};
