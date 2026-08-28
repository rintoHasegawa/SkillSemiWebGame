/**
 * playerSyncService
 * プレイヤー差分同期と可視プレイヤー管理を提供する
 * AOI可視判定と前回送信位置キャッシュを利用して更新量を最小化する
 */
import { contracts as protocol, domain } from "@repo/shared";
import type { UpdatePlayersPayload } from "@repo/shared";
import { collectChangedUpdatePlayersPayload, quantizeUpdatePlayersPayload } from "@server/network/adapters/gamePayloadSanitizers";
import type {
  RealtimeRoomSyncStateStore,
  RoomPlayerPositionCache,
} from "@server/network/adapters/realtimeRoomSyncState";
import type { ReliableEmitters } from "../../CommonHandler";
import { isTargetInAoiWindow, type AoiWindow } from "../aoi/aoiVisibility";
import {
  getActiveBombSnapshotsInRoom,
  type RuntimeResolverDeps,
} from "../runtime/gameRuntimeResolvers";
import type { BombSyncService } from "./bombSyncService";
import {
  forEachRoomViewer,
  refreshViewerAoiWindow,
  type UpdateViewerAoiCellCache,
} from "./roomViewerSyncContext";

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
  updateViewerAoiCellCache: UpdateViewerAoiCellCache;
};

/** プレイヤー差分同期サービスを生成する */
export const createPlayerSyncService = (
  deps: CreatePlayerSyncServiceDeps,
): PlayerSyncService => {
  const syncVisiblePlayersByViewer = (
    roomId: RoomId,
    viewerId: SocketId,
    visiblePlayers: domain.game.player.PlayerData[],
  ): Set<string> => {
    const previousVisibleIds = deps.realtimeRoomSyncState.getVisiblePlayerIdsSnapshot(
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

      deps.reliable.emitToSocketById(viewerId, protocol.SocketEvents.REMOVE_PLAYER, playerId);
    });

    deps.realtimeRoomSyncState.replaceVisiblePlayerIds(roomId, viewerId, nextVisibleIds);
    return nextVisibleIds;
  };

  /**
   * 送信対象から外れたプレイヤーの座標キャッシュを削除する
   * キャッシュが「直近に送った座標のみ」を表す不変条件を保ち，
   * AOI外へ出て同一座標へ戻ったプレイヤーの再送漏れとキャッシュ肥大を防ぐ
   */
  const prunePositionCacheOutOfSendScope = (
    positionCache: RoomPlayerPositionCache,
    scope: {
      visiblePlayerIds: Set<string>;
      tickPlayerIds: Set<string>;
      sendTargetPlayerIds: Set<string>;
    },
  ): void => {
    positionCache.forEach((_position, playerId) => {
      // 今ティックに座標が届いたのに送信対象から外れたプレイヤー
      const isDroppedInThisTick =
        scope.tickPlayerIds.has(playerId) &&
        !scope.sendTargetPlayerIds.has(playerId);

      if (scope.visiblePlayerIds.has(playerId) && !isDroppedInThisTick) {
        return;
      }

      positionCache.delete(playerId);
    });
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

      return isTargetInAoiWindow(player, aoiWindow);
    });
  };

  return {
    publishUpdatePlayersToRoom: (roomId, players) => {
      const activeBombs = getActiveBombSnapshotsInRoom(deps.runtimeDeps, roomId);
      const quantizedPlayers = quantizeUpdatePlayersPayload(players);
      const tickPlayerIds = new Set(
        quantizedPlayers.map((player) => player.id),
      );
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

          const aoiWindow = refreshViewerAoiWindow({
            updateViewerAoiCellCache: deps.updateViewerAoiCellCache,
            roomId,
            viewerId,
            viewer,
          });

          const visibleSnapshotPlayers = buildVisibleSnapshotPlayers(
            roomPlayers,
            viewerId,
            aoiWindow,
            {
              // ローカルプレイヤー実体生成のため，自分自身を初回同期対象に含める
              includeSelf: true,
            },
          );
          const visiblePlayerIds = syncVisiblePlayersByViewer(
            roomId,
            viewerId,
            visibleSnapshotPlayers,
          );

          const visibleDeltaPlayers = quantizedPlayers.filter((player) => {
            if (player.id === viewerId) {
              return false;
            }

            return isTargetInAoiWindow(player, aoiWindow);
          });

          const viewerPositionCache = deps.realtimeRoomSyncState.getPlayerPositionCache(
            roomId,
            viewerId,
          );
          prunePositionCacheOutOfSendScope(viewerPositionCache, {
            visiblePlayerIds,
            tickPlayerIds,
            sendTargetPlayerIds: new Set(
              visibleDeltaPlayers.map((player) => player.id),
            ),
          });

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
