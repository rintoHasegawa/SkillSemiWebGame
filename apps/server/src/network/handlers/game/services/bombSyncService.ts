/**
 * bombSyncService
 * 爆弾のAOI同期と設置通知送信を提供する
 * 可視集合キャッシュ更新とAOI内配信を集約する
 */
import { contracts as protocol, domain } from "@repo/shared";
import type { BombPlacedPayload } from "@repo/shared";
import type { ActiveBombSnapshot } from "@server/domains/game/application/ports/gameUseCasePorts";
import { isBotPlayerId } from "@server/domains/game/application/services/bot/index.js";
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

/** 爆弾同期サービスが提供する操作契約 */
export type BombSyncService = {
  syncVisibleBombsByViewer: (
    roomId: RoomId,
    viewerId: SocketId,
    viewer: domain.game.player.PlayerData,
    bombs: ActiveBombSnapshot[],
  ) => void;
  publishBombPlacedToOthersInRoom: (
    roomId: RoomId,
    excludedSocketId: string,
    payload: BombPlacedPayload,
  ) => void;
};

/** 爆弾同期サービス生成時の依存集合 */
export type CreateBombSyncServiceDeps = {
  reliable: ReliableEmitters;
  runtimeDeps: RuntimeResolverDeps;
  realtimeRoomSyncState: RealtimeRoomSyncStateStore;
  updateViewerAoiCellCache: UpdateViewerAoiCellCache;
};

/** 爆弾のAOI同期サービスを生成する */
export const createBombSyncService = (
  deps: CreateBombSyncServiceDeps,
): BombSyncService => {
  return {
    syncVisibleBombsByViewer: (roomId, viewerId, viewer, bombs) => {
      const aoiWindow = refreshViewerAoiWindow({
        updateViewerAoiCellCache: deps.updateViewerAoiCellCache,
        roomId,
        viewerId,
        viewer,
      });
      const previousVisibleBombIds = deps.realtimeRoomSyncState.getVisibleBombIdsSnapshot(
        roomId,
        viewerId,
      );
      const nextVisibleBombIds = new Set<string>();

      bombs.forEach((bomb) => {
        if (!isTargetInAoiWindow(bomb, aoiWindow)) {
          return;
        }

        nextVisibleBombIds.add(bomb.bombId);
        if (previousVisibleBombIds.has(bomb.bombId)) {
          return;
        }

        if (viewerId === bomb.ownerPlayerId && !isBotPlayerId(bomb.ownerPlayerId)) {
          return;
        }

        const syncPayload: BombPlacedPayload = {
          bombId: bomb.bombId,
          ownerTeamId: bomb.ownerTeamId,
          x: bomb.x,
          y: bomb.y,
          explodeAtElapsedMs: bomb.explodeAtElapsedMs,
        };
        deps.reliable.emitToSocketById(
          viewerId,
          protocol.SocketEvents.BOMB_PLACED,
          syncPayload,
        );
      });

      deps.realtimeRoomSyncState.replaceVisibleBombIds(
        roomId,
        viewerId,
        nextVisibleBombIds,
      );
    },
    publishBombPlacedToOthersInRoom: (roomId, excludedSocketId, payload) => {
      forEachRoomViewer({
        runtimeDeps: deps.runtimeDeps,
        roomId,
        run: ({ viewerId, viewer }) => {
          if (viewerId === excludedSocketId && !isBotPlayerId(excludedSocketId)) {
            return;
          }

          const aoiWindow = refreshViewerAoiWindow({
            updateViewerAoiCellCache: deps.updateViewerAoiCellCache,
            roomId,
            viewerId,
            viewer,
          });
          if (!isTargetInAoiWindow(payload, aoiWindow)) {
            return;
          }

          deps.reliable.emitToSocketById(
            viewerId,
            protocol.SocketEvents.BOMB_PLACED,
            payload,
          );
        },
      });
    },
  };
};
