/**
 * hurricaneSyncService
 * ハリケーンのAOI同期送信を提供する
 * 受信者ごとの可視集合差分とルーム内最新スナップショットを管理する
 */
import { contracts as protocol, domain } from "@repo/shared";
import type {
  CurrentHurricanesPayload,
  HurricaneStatePayload,
  UpdateHurricanesPayload,
} from "@repo/shared";
import type { RealtimeRoomSyncStateStore } from "@server/network/adapters/realtimeRoomSyncState";
import type { ReliableEmitters } from "../../CommonHandler";
import { isTargetInAoiWindow, resolveViewerAoiWindow, type AoiWindow } from "../aoi/aoiVisibility";
import {
  type RuntimeResolverDeps,
} from "../runtime/gameRuntimeResolvers";
import { forEachRoomViewer } from "./roomViewerSyncContext";

type RoomId = domain.room.Room["roomId"];
type SocketId = string;

/** ハリケーン同期サービスが提供する操作契約 */
export type HurricaneSyncService = {
  publishCurrentHurricanesToRoom: (
    roomId: RoomId,
    hurricanes: CurrentHurricanesPayload,
  ) => void;
  publishUpdateHurricanesToRoom: (
    roomId: RoomId,
    hurricanes: UpdateHurricanesPayload,
  ) => void;
  clearRoomSnapshot: (roomId: RoomId) => void;
};

/** ハリケーン同期サービス生成時の依存集合 */
export type CreateHurricaneSyncServiceDeps = {
  reliable: ReliableEmitters;
  runtimeDeps: RuntimeResolverDeps;
  realtimeRoomSyncState: RealtimeRoomSyncStateStore;
  updateViewerAoiCellCache: (
    roomId: RoomId,
    viewerId: SocketId,
    viewer: domain.game.player.PlayerData,
  ) => void;
};

/** ハリケーンAOI同期サービスを生成する */
export const createHurricaneSyncService = (
  deps: CreateHurricaneSyncServiceDeps,
): HurricaneSyncService => {
  const hurricaneSnapshotByRoomId = new Map<RoomId, Map<string, HurricaneStatePayload>>();

  const isInViewerAoi = (
    target: { x: number; y: number },
    aoiWindow: AoiWindow,
  ): boolean => {
    return isTargetInAoiWindow(target, aoiWindow);
  };

  const replaceRoomHurricaneSnapshot = (
    roomId: RoomId,
    hurricanes: HurricaneStatePayload[],
  ): void => {
    const snapshotMap = new Map<string, HurricaneStatePayload>();
    hurricanes.forEach((hurricane) => {
      snapshotMap.set(hurricane.id, hurricane);
    });
    hurricaneSnapshotByRoomId.set(roomId, snapshotMap);
  };

  const upsertRoomHurricaneSnapshot = (
    roomId: RoomId,
    hurricanes: HurricaneStatePayload[],
  ): void => {
    const snapshotMap = hurricaneSnapshotByRoomId.get(roomId) ?? new Map();
    hurricanes.forEach((hurricane) => {
      snapshotMap.set(hurricane.id, hurricane);
    });
    hurricaneSnapshotByRoomId.set(roomId, snapshotMap);
  };

  const collectVisibleHurricanesByViewer = (
    roomId: RoomId,
    viewerId: SocketId,
    viewer: domain.game.player.PlayerData,
    hurricanes: Iterable<HurricaneStatePayload>,
  ): HurricaneStatePayload[] => {
    deps.updateViewerAoiCellCache(roomId, viewerId, viewer);
    const aoiWindow = resolveViewerAoiWindow(viewer);
    const visibleHurricanes: HurricaneStatePayload[] = [];

    for (const hurricane of hurricanes) {
      if (isInViewerAoi(hurricane, aoiWindow)) {
        visibleHurricanes.push(hurricane);
      }
    }

    return visibleHurricanes;
  };

  const syncVisibleHurricaneIdsByViewer = (
    roomId: RoomId,
    viewerId: SocketId,
    hurricanes: HurricaneStatePayload[],
  ): void => {
    const nextVisibleIds = hurricanes.map((hurricane) => hurricane.id);
    deps.realtimeRoomSyncState.replaceVisibleHurricaneIds(
      roomId,
      viewerId,
      nextVisibleIds,
    );
  };

  const hasChangedVisibleHurricaneIds = (
    previousVisibleIds: Set<string>,
    nextVisibleHurricanes: HurricaneStatePayload[],
  ): boolean => {
    if (previousVisibleIds.size !== nextVisibleHurricanes.length) {
      return true;
    }

    for (const hurricane of nextVisibleHurricanes) {
      if (!previousVisibleIds.has(hurricane.id)) {
        return true;
      }
    }

    return false;
  };

  return {
    publishCurrentHurricanesToRoom: (roomId, hurricanes) => {
      replaceRoomHurricaneSnapshot(roomId, hurricanes);

      forEachRoomViewer({
        runtimeDeps: deps.runtimeDeps,
        roomId,
        run: ({ viewerId, viewer }) => {
        const visibleHurricanes = collectVisibleHurricanesByViewer(
          roomId,
          viewerId,
          viewer,
          hurricanes,
        );
        syncVisibleHurricaneIdsByViewer(roomId, viewerId, visibleHurricanes);

        deps.reliable.emitToSocketById(
          viewerId,
          protocol.SocketEvents.CURRENT_HURRICANES,
          visibleHurricanes,
        );
        },
      });
    },
    publishUpdateHurricanesToRoom: (roomId, hurricanes) => {
      upsertRoomHurricaneSnapshot(roomId, hurricanes);

      const roomSnapshot = hurricaneSnapshotByRoomId.get(roomId);

      forEachRoomViewer({
        runtimeDeps: deps.runtimeDeps,
        roomId,
        run: ({ viewerId, viewer }) => {
        const nextVisibleHurricanes = collectVisibleHurricanesByViewer(
          roomId,
          viewerId,
          viewer,
          roomSnapshot?.values() ?? [],
        );
        const previousVisibleIds = new Set(
          deps.realtimeRoomSyncState.getVisibleHurricaneIdsSnapshot(roomId, viewerId),
        );
        const hasMembershipChanged = hasChangedVisibleHurricaneIds(
          previousVisibleIds,
          nextVisibleHurricanes,
        );

        if (hasMembershipChanged) {
          deps.reliable.emitToSocketById(
            viewerId,
            protocol.SocketEvents.CURRENT_HURRICANES,
            nextVisibleHurricanes,
          );
          syncVisibleHurricaneIdsByViewer(roomId, viewerId, nextVisibleHurricanes);
          return;
        }

        const nextVisibleIdSet = new Set(nextVisibleHurricanes.map((hurricane) => hurricane.id));
        const visibleUpdateHurricanes = hurricanes.filter((hurricane) => {
          return nextVisibleIdSet.has(hurricane.id);
        });
        if (visibleUpdateHurricanes.length === 0) {
          return;
        }

        deps.reliable.emitToSocketById(
          viewerId,
          protocol.SocketEvents.UPDATE_HURRICANES,
          visibleUpdateHurricanes,
        );
        syncVisibleHurricaneIdsByViewer(roomId, viewerId, nextVisibleHurricanes);
        },
      });
    },
    clearRoomSnapshot: (roomId) => {
      hurricaneSnapshotByRoomId.delete(roomId);
    },
  };
};
