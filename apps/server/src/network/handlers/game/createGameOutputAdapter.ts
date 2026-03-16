/**
 * createGameOutputAdapter
 * ゲーム系ユースケースから利用する送信関数群を生成する
 */
import { Server } from "socket.io";
import { contracts as protocol, domain as domainNs } from "@repo/shared";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  HurricaneStatePayload,
  domain,
  GameStartPayload,
  GameResultPayload,
  HurricaneHitPayload,
  PlayerHitPayload,
  PongPayload,
  CurrentHurricanesPayload,
  CurrentPlayersPayload,
  RemovePlayerPayload,
  UpdateHurricanesPayload,
  UpdatePlayersPayload,
} from "@repo/shared";
import type {
  ActiveBombSnapshot,
  BombPlacementOutputPort,
  PlayerHitOutputPort,
  GameOutputPort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import { isBotPlayerId } from "@server/domains/game/application/services/bot/index.js";
import {
  collectChangedUpdatePlayersPayload,
  quantizeUpdatePlayersPayload,
} from "@server/network/adapters/gamePayloadSanitizers";
import { createRealtimeRoomSyncStateStore } from "@server/network/adapters/realtimeRoomSyncState";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";
import type { CommonHandlerContext } from "../CommonHandler";
import type {
  FindGameByRoomPort,
  FindRoomByIdPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";
import {
  isTargetInAoiWindow,
  resolveViewerAoiCell,
  resolveViewerAoiWindow,
  type AoiWindow,
} from "./aoi/aoiVisibility";
import {
  getActiveBombSnapshotsInRoom,
  getConnectedSocketIdsInRoom,
  getRoomPlayers,
  type RuntimeResolverDeps,
} from "./runtime/gameRuntimeResolvers";

type RoomId = domain.room.Room["roomId"];
type SocketId = string;

type ReliableRoomEvent =
  | typeof protocol.SocketEvents.UPDATE_PLAYERS
  | typeof protocol.SocketEvents.UPDATE_MAP_CELLS
  | typeof protocol.SocketEvents.CURRENT_HURRICANES
  | typeof protocol.SocketEvents.UPDATE_HURRICANES
  | typeof protocol.SocketEvents.GAME_END
  | typeof protocol.SocketEvents.GAME_RESULT
  | typeof protocol.SocketEvents.GAME_START
  | typeof protocol.SocketEvents.HURRICANE_HIT;

/** ゲーム出力アダプターのインターフェース */
export type GameOutputAdapter = Omit<
  GameOutputPort,
  "publishPlayerRemovedToRoom"
> &
  BombPlacementOutputPort &
  PlayerHitOutputPort;

/** ゲーム切断時の出力アダプターのインターフェース */
export type GameDisconnectOutputAdapter = Pick<
  GameOutputPort,
  "publishPlayerRemovedToRoom"
>;

/** 共通送信コンテキストからゲーム出力アダプターを生成する */
export const createGameOutputAdapter = (
  common: CommonHandlerContext,
  deps: RuntimeResolverDeps,
): GameOutputAdapter => {
  const { reliable } = common;
  const { roomManager, runtimeRegistry } = deps;
  const realtimeRoomSyncState = createRealtimeRoomSyncStateStore();
  const hurricaneSnapshotByRoomId = new Map<
    RoomId,
    Map<string, HurricaneStatePayload>
  >();

  const getPlayersInRoom = (roomId: RoomId): domain.game.player.PlayerData[] => {
    return getRoomPlayers(deps, roomId);
  };

  const getActiveBombsInRoom = (roomId: RoomId): ActiveBombSnapshot[] => {
    return getActiveBombSnapshotsInRoom(deps, roomId);
  };

  const isInViewerAoi = (
    target: { x: number; y: number },
    aoiWindow: AoiWindow,
  ): boolean => {
    return isTargetInAoiWindow(target, aoiWindow);
  };

  const updateViewerAoiCellCache = (
    roomId: RoomId,
    viewerId: SocketId,
    viewer: domain.game.player.PlayerData,
  ): void => {
    const nextCell = resolveViewerAoiCell(viewer);
    const previousCell = realtimeRoomSyncState.getLastAoiCell(roomId, viewerId);

    if (previousCell && domainNs.game.aoi.isSameAoiCell(previousCell, nextCell)) {
      return;
    }

    realtimeRoomSyncState.setLastAoiCell(roomId, viewerId, nextCell);
  };

  const syncVisiblePlayersByViewer = (
    roomId: RoomId,
    viewerId: SocketId,
    visiblePlayers: domain.game.player.PlayerData[],
  ): void => {
    const previousVisibleIds = realtimeRoomSyncState.getVisiblePlayerIdsSnapshot(
      roomId,
      viewerId,
    );
    const viewerPositionCache = realtimeRoomSyncState.getPlayerPositionCache(
      roomId,
      viewerId,
    );
    const nextVisibleIds = new Set(visiblePlayers.map((player) => player.id));

    visiblePlayers.forEach((player) => {
      if (!previousVisibleIds.has(player.id)) {
        reliable.emitToSocketById(viewerId, protocol.SocketEvents.NEW_PLAYER, player);
      }
    });

    previousVisibleIds.forEach((playerId) => {
      if (nextVisibleIds.has(playerId)) {
        return;
      }

      viewerPositionCache.delete(playerId);
      reliable.emitToSocketById(viewerId, protocol.SocketEvents.REMOVE_PLAYER, playerId);
    });

    realtimeRoomSyncState.replaceVisiblePlayerIds(roomId, viewerId, nextVisibleIds);
  };

  const syncVisibleBombsByViewer = (
    roomId: RoomId,
    viewerId: SocketId,
    viewer: domain.game.player.PlayerData,
    bombs: ActiveBombSnapshot[],
  ): void => {
    updateViewerAoiCellCache(roomId, viewerId, viewer);
    const aoiWindow = resolveViewerAoiWindow(viewer);
    const previousVisibleBombIds = realtimeRoomSyncState.getVisibleBombIdsSnapshot(
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

      const payload: BombPlacedPayload = {
        bombId: bomb.bombId,
        ownerTeamId: bomb.ownerTeamId,
        x: bomb.x,
        y: bomb.y,
        explodeAtElapsedMs: bomb.explodeAtElapsedMs,
      };
      reliable.emitToSocketById(viewerId, protocol.SocketEvents.BOMB_PLACED, payload);
    });

    realtimeRoomSyncState.replaceVisibleBombIds(
      roomId,
      viewerId,
      nextVisibleBombIds,
    );
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
    updateViewerAoiCellCache(roomId, viewerId, viewer);
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
    realtimeRoomSyncState.replaceVisibleHurricaneIds(
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

  const emitReliableToRoom = (
    roomId: RoomId,
    event: ReliableRoomEvent,
    payload?: unknown,
  ): void => {
    if (payload === undefined) {
      reliable.emitToRoom(roomId, event);
      return;
    }

    reliable.emitToRoom(roomId, event, payload as never);
  };

  return {
    publishPongToSocket: (payload: PongPayload) => {
      reliable.emitToSocket(protocol.SocketEvents.PONG, payload);
    },
    publishUpdatePlayersToRoom: (
      roomId: RoomId,
      players: UpdatePlayersPayload,
    ) => {
      const roomPlayers = getPlayersInRoom(roomId);
      const activeBombs = getActiveBombsInRoom(roomId);
      if (roomPlayers.length === 0) {
        return;
      }

      const quantizedPlayers = quantizeUpdatePlayersPayload(players);
      const roomPlayerById = new Map(roomPlayers.map((player) => [player.id, player]));
      const recipientSocketIds = getConnectedSocketIdsInRoom(deps, roomId);

      recipientSocketIds.forEach((viewerId) => {
        const viewer = roomPlayerById.get(viewerId);
        if (!viewer) {
          return;
        }

        syncVisibleBombsByViewer(roomId, viewerId, viewer, activeBombs);

        updateViewerAoiCellCache(roomId, viewerId, viewer);
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

        const viewerPositionCache = realtimeRoomSyncState.getPlayerPositionCache(
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

        reliable.emitToSocketById(
          viewerId,
          protocol.SocketEvents.UPDATE_PLAYERS,
          changedPlayers,
        );
      });
    },

    publishMapCellUpdatesToRoom: (
      roomId: RoomId,
      cellUpdates: domainNs.game.gridMap.CellUpdate[],
    ) => {
      const grouped = domainNs.game.gridMap.groupCellUpdates(cellUpdates);
      emitReliableToRoom(roomId, protocol.SocketEvents.UPDATE_MAP_CELLS, grouped);
    },
    publishCurrentHurricanesToRoom: (
      roomId: RoomId,
      hurricanes: CurrentHurricanesPayload,
    ) => {
      replaceRoomHurricaneSnapshot(roomId, hurricanes);

      const roomPlayers = getPlayersInRoom(roomId);
      if (roomPlayers.length === 0) {
        return;
      }

      const roomPlayerById = new Map(roomPlayers.map((player) => [player.id, player]));
      const recipientSocketIds = getConnectedSocketIdsInRoom(deps, roomId);

      recipientSocketIds.forEach((viewerId) => {
        const viewer = roomPlayerById.get(viewerId);
        if (!viewer) {
          return;
        }

        const visibleHurricanes = collectVisibleHurricanesByViewer(
          roomId,
          viewerId,
          viewer,
          hurricanes,
        );
        syncVisibleHurricaneIdsByViewer(roomId, viewerId, visibleHurricanes);

        reliable.emitToSocketById(
          viewerId,
          protocol.SocketEvents.CURRENT_HURRICANES,
          visibleHurricanes,
        );
      });
    },
    publishUpdateHurricanesToRoom: (
      roomId: RoomId,
      hurricanes: UpdateHurricanesPayload,
    ) => {
      upsertRoomHurricaneSnapshot(roomId, hurricanes);

      const roomPlayers = getPlayersInRoom(roomId);
      if (roomPlayers.length === 0) {
        return;
      }

      const roomPlayerById = new Map(roomPlayers.map((player) => [player.id, player]));
      const recipientSocketIds = getConnectedSocketIdsInRoom(deps, roomId);
      const roomSnapshot = hurricaneSnapshotByRoomId.get(roomId);

      recipientSocketIds.forEach((viewerId) => {
        const viewer = roomPlayerById.get(viewerId);
        if (!viewer) {
          return;
        }

        const nextVisibleHurricanes = collectVisibleHurricanesByViewer(
          roomId,
          viewerId,
          viewer,
          roomSnapshot?.values() ?? [],
        );
        const previousVisibleIds = new Set(
          realtimeRoomSyncState.getVisibleHurricaneIdsSnapshot(roomId, viewerId),
        );
        const hasMembershipChanged = hasChangedVisibleHurricaneIds(
          previousVisibleIds,
          nextVisibleHurricanes,
        );

        if (hasMembershipChanged) {
          reliable.emitToSocketById(
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

        reliable.emitToSocketById(
          viewerId,
          protocol.SocketEvents.UPDATE_HURRICANES,
          visibleUpdateHurricanes,
        );
        syncVisibleHurricaneIdsByViewer(roomId, viewerId, nextVisibleHurricanes);
      });
    },
    publishGameEndToRoom: (roomId: RoomId) => {
      realtimeRoomSyncState.resetRoom(roomId);
      hurricaneSnapshotByRoomId.delete(roomId);
      emitReliableToRoom(roomId, protocol.SocketEvents.GAME_END);
    },
    publishGameResultToRoom: (roomId: RoomId, payload: GameResultPayload) => {
      emitReliableToRoom(roomId, protocol.SocketEvents.GAME_RESULT, payload);
    },
    publishGameStartToRoom: (roomId: RoomId, payload: GameStartPayload) => {
      realtimeRoomSyncState.resetRoom(roomId);
      hurricaneSnapshotByRoomId.delete(roomId);
      emitReliableToRoom(roomId, protocol.SocketEvents.GAME_START, payload);
    },
    publishCurrentPlayersToSocket: (players: CurrentPlayersPayload) => {
      reliable.emitToSocket(protocol.SocketEvents.CURRENT_PLAYERS, players);
    },
    publishGameStartToSocket: (payload: GameStartPayload) => {
      reliable.emitToSocket(protocol.SocketEvents.GAME_START, payload);
    },
    publishBombPlacedToOthersInRoom: (
      roomId: RoomId,
      excludedSocketId: string,
      payload: BombPlacedPayload,
    ) => {
      const roomPlayers = getPlayersInRoom(roomId);
      if (roomPlayers.length === 0) {
        return;
      }

      const roomPlayerById = new Map(roomPlayers.map((player) => [player.id, player]));
      const recipientSocketIds = getConnectedSocketIdsInRoom(deps, roomId);

      recipientSocketIds.forEach((viewerId) => {
        if (viewerId === excludedSocketId && !isBotPlayerId(excludedSocketId)) {
          return;
        }

        const viewer = roomPlayerById.get(viewerId);
        if (!viewer) {
          return;
        }

        updateViewerAoiCellCache(roomId, viewerId, viewer);
        const aoiWindow = resolveViewerAoiWindow(viewer);
        if (!isInViewerAoi(payload, aoiWindow)) {
          return;
        }

        reliable.emitToSocketById(viewerId, protocol.SocketEvents.BOMB_PLACED, payload);
      });
    },
    publishBombPlacedAckToSocket: (
      socketId: string,
      payload: BombPlacedAckPayload,
    ) => {
      reliable.emitToSocketById(
        socketId,
        protocol.SocketEvents.BOMB_PLACED_ACK,
        payload,
      );
    },
    publishPlayerHitToOthersInRoom: (
      roomId: RoomId,
      deadPlayerId: string,
      payload: PlayerHitPayload,
    ) => {
      reliable.emitToRoomExceptSocket(
        roomId,
        deadPlayerId,
        protocol.SocketEvents.PLAYER_HIT,
        payload,
      );
    },
    publishPlayerHitToRoom: (roomId: RoomId, payload: PlayerHitPayload) => {
      reliable.emitToRoom(roomId, protocol.SocketEvents.PLAYER_HIT, payload);
    },
    publishHurricaneHitToRoom: (
      roomId: RoomId,
      payload: HurricaneHitPayload,
    ) => {
      emitReliableToRoom(roomId, protocol.SocketEvents.HURRICANE_HIT, payload);
    },
  };
};

/** ゲーム切断時の送信関数群を生成する */
export const createGameDisconnectOutputAdapter = (
  io: Server,
): GameDisconnectOutputAdapter => {
  const emitToRoom = createEmitToRoom(io);

  return {
    publishPlayerRemovedToRoom: (
      roomId: RoomId,
      removedPlayerId: RemovePlayerPayload,
    ) => {
      emitToRoom(roomId, protocol.SocketEvents.REMOVE_PLAYER, removedPlayerId);
    },
  };
};
