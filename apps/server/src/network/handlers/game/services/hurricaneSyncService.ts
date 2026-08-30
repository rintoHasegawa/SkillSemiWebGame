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
import { isTargetInAoiWindow } from "../aoi/aoiVisibility";
import {
  type RuntimeResolverDeps,
} from "../runtime/gameRuntimeResolvers";
import {
  forEachRoomViewer,
  refreshViewerAoiWindow,
  type UpdateViewerAoiCellCache,
} from "./roomViewerSyncContext";

type RoomId = domain.room.Room["roomId"];
type SocketId = string;

// ルーム1件分のハリケーンスナップショット（ハリケーンID → 最新状態）
type RoomHurricaneSnapshot = Map<string, HurricaneStatePayload>;

/** ハリケーン同期サービスが提供する操作契約 */
export type HurricaneSyncService = {
  publishCurrentHurricanesToRoom: (
    roomId: RoomId,
    hurricanes: CurrentHurricanesPayload,
  ) => void;
  publishUpdateHurricanesToRoom: (
    roomId: RoomId,
    hurricanes: UpdateHurricanesPayload,
    activeHurricaneIds: string[],
  ) => void;
  /**
   * ルームのハリケーンスナップショットを破棄する
   * 受信者ごとの可視集合と対で初期化する必要があるため，
   * 呼び出し側は realtimeRoomSyncState.resetRoom と必ず対で呼ぶ
   */
  clearRoomSnapshot: (roomId: RoomId) => void;
};

/** ハリケーン同期サービス生成時の依存集合 */
export type CreateHurricaneSyncServiceDeps = {
  reliable: ReliableEmitters;
  runtimeDeps: RuntimeResolverDeps;
  realtimeRoomSyncState: RealtimeRoomSyncStateStore;
  updateViewerAoiCellCache: UpdateViewerAoiCellCache;
};

/** ハリケーンAOI同期サービスを生成する */
export const createHurricaneSyncService = (
  deps: CreateHurricaneSyncServiceDeps,
): HurricaneSyncService => {
  const hurricaneSnapshotByRoomId = new Map<RoomId, RoomHurricaneSnapshot>();

  const replaceRoomHurricaneSnapshot = (
    roomId: RoomId,
    hurricanes: HurricaneStatePayload[],
  ): void => {
    const snapshotMap: RoomHurricaneSnapshot = new Map();
    hurricanes.forEach((hurricane) => {
      snapshotMap.set(hurricane.id, hurricane);
    });
    hurricaneSnapshotByRoomId.set(roomId, snapshotMap);
  };

  /**
   * 差分更新をスナップショットへ反映し，生存していないハリケーンを削除する
   * スナップショットがサーバー上の現存ハリケーンのみを表す状態を保つ
   */
  const syncRoomHurricaneSnapshot = (
    roomId: RoomId,
    hurricanes: HurricaneStatePayload[],
    activeHurricaneIds: string[],
  ): void => {
    const snapshotMap: RoomHurricaneSnapshot =
      hurricaneSnapshotByRoomId.get(roomId) ?? new Map();
    const activeIds = new Set(activeHurricaneIds);

    // 消滅したハリケーンを落としてから今回の差分を反映する
    snapshotMap.forEach((_hurricane, hurricaneId) => {
      if (activeIds.has(hurricaneId)) {
        return;
      }

      snapshotMap.delete(hurricaneId);
    });

    hurricanes.forEach((hurricane) => {
      if (!activeIds.has(hurricane.id)) {
        return;
      }

      snapshotMap.set(hurricane.id, hurricane);
    });
    hurricaneSnapshotByRoomId.set(roomId, snapshotMap);
  };

  // 同期対象も保持中のスナップショットも無い場合は受信者走査ごと省略できる
  const hasNothingToSync = (
    roomId: RoomId,
    hurricanes: HurricaneStatePayload[],
    activeHurricaneIds: string[],
  ): boolean => {
    const snapshotSize = hurricaneSnapshotByRoomId.get(roomId)?.size ?? 0;
    return (
      hurricanes.length === 0 &&
      activeHurricaneIds.length === 0 &&
      snapshotSize === 0
    );
  };

  const collectVisibleHurricanesByViewer = (
    roomId: RoomId,
    viewerId: SocketId,
    viewer: domain.game.player.PlayerData,
    hurricanes: Iterable<HurricaneStatePayload>,
  ): HurricaneStatePayload[] => {
    const aoiWindow = refreshViewerAoiWindow({
      updateViewerAoiCellCache: deps.updateViewerAoiCellCache,
      roomId,
      viewerId,
      viewer,
    });
    const visibleHurricanes: HurricaneStatePayload[] = [];

    for (const hurricane of hurricanes) {
      if (isTargetInAoiWindow(hurricane, aoiWindow)) {
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

      // 全量同期は受信側の置換契機であり，可視0件でも空配列を送って状態を確定させる
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
    publishUpdateHurricanesToRoom: (roomId, hurricanes, activeHurricaneIds) => {
      if (hasNothingToSync(roomId, hurricanes, activeHurricaneIds)) {
        return;
      }

      syncRoomHurricaneSnapshot(roomId, hurricanes, activeHurricaneIds);

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
