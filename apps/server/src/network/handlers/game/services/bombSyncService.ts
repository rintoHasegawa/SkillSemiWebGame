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
import {
  isTargetInAoiWindow,
  resolveViewerAoiWindow,
  type AoiWindow,
} from "../aoi/aoiVisibility";
import {
  getConnectedSocketIdsInRoom,
  getRoomPlayers,
  type RuntimeResolverDeps,
} from "../runtime/gameRuntimeResolvers";

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
  updateViewerAoiCellCache: (
    roomId: RoomId,
    viewerId: SocketId,
    viewer: domain.game.player.PlayerData,
  ) => void;
};

/** 爆弾のAOI同期サービスを生成する */
export const createBombSyncService = (
  deps: CreateBombSyncServiceDeps,
): BombSyncService => {
  const isInViewerAoi = (
    target: { x: number; y: number },
    aoiWindow: AoiWindow,
  ): boolean => {
    return isTargetInAoiWindow(target, aoiWindow);
  };

  return {
    syncVisibleBombsByViewer: (roomId, viewerId, viewer, bombs) => {
      deps.updateViewerAoiCellCache(roomId, viewerId, viewer);
      const aoiWindow = resolveViewerAoiWindow(viewer);
      const previousVisibleBombIds = deps.realtimeRoomSyncState.getVisibleBombIdsSnapshot(
        roomId,
        viewerId,
      );
      const nextVisibleBombIds = new Set<string>();

      bombs.forEach((bomb) => {
        if (!isInViewerAoi(bomb, aoiWindow)) {
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
      const roomPlayers = getRoomPlayers(deps.runtimeDeps, roomId);
      if (roomPlayers.length === 0) {
        return;
      }

      const roomPlayerById = new Map(roomPlayers.map((player) => [player.id, player]));
      const recipientSocketIds = getConnectedSocketIdsInRoom(deps.runtimeDeps, roomId);

      recipientSocketIds.forEach((viewerId) => {
        if (viewerId === excludedSocketId && !isBotPlayerId(excludedSocketId)) {
          return;
        }

        const viewer = roomPlayerById.get(viewerId);
        if (!viewer) {
          return;
        }

        deps.updateViewerAoiCellCache(roomId, viewerId, viewer);
        const aoiWindow = resolveViewerAoiWindow(viewer);
        if (!isInViewerAoi(payload, aoiWindow)) {
          return;
        }

        deps.reliable.emitToSocketById(viewerId, protocol.SocketEvents.BOMB_PLACED, payload);
      });
    },
  };
};
