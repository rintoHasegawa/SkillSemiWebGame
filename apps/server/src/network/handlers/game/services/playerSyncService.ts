/**
 * playerSyncService
 * プレイヤー差分同期と可視プレイヤー管理を提供する
 * AOI可視判定と前回送信位置キャッシュを利用して更新量を最小化する
 */
import { contracts as protocol, domain } from "@repo/shared";
import type { UpdatePlayersPayload } from "@repo/shared";
import { collectChangedUpdatePlayersPayload, quantizeUpdatePlayersPayload } from "@server/network/adapters/gamePayloadSanitizers";
import type { RealtimeRoomSyncStateStore } from "@server/network/adapters/realtimeRoomSyncState";
import type { ReliableEmitters } from "../../CommonHandler";
import { isTargetInAoiWindow, resolveViewerAoiWindow, type AoiWindow } from "../aoi/aoiVisibility";
import {
  getActiveBombSnapshotsInRoom,
  type RuntimeResolverDeps,
} from "../runtime/gameRuntimeResolvers";
import type { BombSyncService } from "./bombSyncService";
import { forEachRoomViewer } from "./roomViewerSyncContext";

type RoomId = domain.room.Room["roomId"];
type SocketId = string;

/** プレイヤー同期サービスが提供する操作契約 */
export type PlayerSyncService = {
  publishUpdatePlayersToRoom: (
    roomId: RoomId,
    players: UpdatePlayersPayload,
  ) => void;
};

/** プレイヤー同期サービス生成時の依存集合 */
export type CreatePlayerSyncServiceDeps = {
  reliable: ReliableEmitters;
  runtimeDeps: RuntimeResolverDeps;
  realtimeRoomSyncState: RealtimeRoomSyncStateStore;
  bombSyncService: Pick<BombSyncService, "syncVisibleBombsByViewer">;
  updateViewerAoiCellCache: (
    roomId: RoomId,
    viewerId: SocketId,
    viewer: domain.game.player.PlayerData,
  ) => void;
};

/** プレイヤー差分同期サービスを生成する */
export const createPlayerSyncService = (
  deps: CreatePlayerSyncServiceDeps,
): PlayerSyncService => {
  const isInViewerAoi = (
    target: { x: number; y: number },
    aoiWindow: AoiWindow,
  ): boolean => {
    return isTargetInAoiWindow(target, aoiWindow);
  };

  const syncVisiblePlayersByViewer = (
    roomId: RoomId,
    viewerId: SocketId,
    visiblePlayers: domain.game.player.PlayerData[],
  ): void => {
    const previousVisibleIds = deps.realtimeRoomSyncState.getVisiblePlayerIdsSnapshot(
      roomId,
      viewerId,
    );
    const viewerPositionCache = deps.realtimeRoomSyncState.getPlayerPositionCache(
      roomId,
      viewerId,
    );
    const nextVisibleIds = new Set(visiblePlayers.map((player) => player.id));

    visiblePlayers.forEach((player) => {
      if (!previousVisibleIds.has(player.id)) {
        deps.reliable.emitToSocketById(viewerId, protocol.SocketEvents.NEW_PLAYER, player);
      }
    });

    previousVisibleIds.forEach((playerId) => {
      if (nextVisibleIds.has(playerId)) {
        return;
      }

      viewerPositionCache.delete(playerId);
      deps.reliable.emitToSocketById(viewerId, protocol.SocketEvents.REMOVE_PLAYER, playerId);
    });

    deps.realtimeRoomSyncState.replaceVisiblePlayerIds(roomId, viewerId, nextVisibleIds);
  };

  const buildVisibleSnapshotPlayers = (
    roomPlayers: domain.game.player.PlayerData[],
    viewerId: SocketId,
    aoiWindow: AoiWindow,
    options: {
      includeSelf: boolean;
    },
  ): domain.game.player.PlayerData[] => {
    return roomPlayers.filter((player) => {
      if (player.id === viewerId) {
        return options.includeSelf;
      }

      return isInViewerAoi(player, aoiWindow);
    });
  };

  return {
    publishUpdatePlayersToRoom: (roomId, players) => {
      const activeBombs = getActiveBombSnapshotsInRoom(deps.runtimeDeps, roomId);
      const quantizedPlayers = quantizeUpdatePlayersPayload(players);
      forEachRoomViewer({
        runtimeDeps: deps.runtimeDeps,
        roomId,
        run: ({ viewerId, viewer, roomPlayers }) => {
          deps.bombSyncService.syncVisibleBombsByViewer(
            roomId,
            viewerId,
            viewer,
            activeBombs,
          );

          deps.updateViewerAoiCellCache(roomId, viewerId, viewer);
          const aoiWindow = resolveViewerAoiWindow(viewer);

          const visibleSnapshotPlayers = buildVisibleSnapshotPlayers(
            roomPlayers,
            viewerId,
            aoiWindow,
            {
              // ローカルプレイヤー実体生成のため，自分自身を初回同期対象に含める
              includeSelf: true,
            },
          );
          syncVisiblePlayersByViewer(roomId, viewerId, visibleSnapshotPlayers);

          const visibleDeltaPlayers = quantizedPlayers.filter((player) => {
            if (player.id === viewerId) {
              return false;
            }

            return isInViewerAoi(player, aoiWindow);
          });

          const viewerPositionCache = deps.realtimeRoomSyncState.getPlayerPositionCache(
            roomId,
            viewerId,
          );
          const changedPlayers = collectChangedUpdatePlayersPayload(
            visibleDeltaPlayers,
            viewerPositionCache,
          );

          if (changedPlayers.length === 0) {
            return;
          }

          deps.reliable.emitToSocketById(
            viewerId,
            protocol.SocketEvents.UPDATE_PLAYERS,
            changedPlayers,
          );
        },
      });
    },
  };
};
