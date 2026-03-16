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
  getConnectedSocketIdsInRoom,
  getRoomPlayers,
  type RuntimeResolverDeps,
} from "../runtime/gameRuntimeResolvers";
import type { BombSyncService } from "./bombSyncService";

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

  return {
    publishUpdatePlayersToRoom: (roomId, players) => {
      const roomPlayers = getRoomPlayers(deps.runtimeDeps, roomId);
      const activeBombs = getActiveBombSnapshotsInRoom(deps.runtimeDeps, roomId);
      if (roomPlayers.length === 0) {
        return;
      }

      const quantizedPlayers = quantizeUpdatePlayersPayload(players);
      const roomPlayerById = new Map(roomPlayers.map((player) => [player.id, player]));
      const recipientSocketIds = getConnectedSocketIdsInRoom(deps.runtimeDeps, roomId);

      recipientSocketIds.forEach((viewerId) => {
        const viewer = roomPlayerById.get(viewerId);
        if (!viewer) {
          return;
        }

        deps.bombSyncService.syncVisibleBombsByViewer(
          roomId,
          viewerId,
          viewer,
          activeBombs,
        );

        deps.updateViewerAoiCellCache(roomId, viewerId, viewer);
        const aoiWindow = resolveViewerAoiWindow(viewer);

        const visibleSnapshotPlayers = roomPlayers.filter((player) => {
          if (player.id === viewerId) {
            return false;
          }

          return isInViewerAoi(player, aoiWindow);
        });
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
      });
    },
  };
};
