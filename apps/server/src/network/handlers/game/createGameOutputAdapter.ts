/**
 * createGameOutputAdapter
 * ゲーム系ユースケースから利用する送信関数群を生成する
 */
import { Server } from "socket.io";
import { contracts as protocol, domain as domainNs } from "@repo/shared";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
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
import { config } from "@server/config";
import type {
  FindGameByRoomPort,
  FindRoomByIdPort,
} from "@server/domains/room/application/ports/roomUseCasePorts";

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
  deps: {
    roomManager: FindRoomByIdPort;
    runtimeRegistry: FindGameByRoomPort;
  },
): GameOutputAdapter => {
  const { reliable } = common;
  const { roomManager, runtimeRegistry } = deps;
  const realtimeRoomSyncState = createRealtimeRoomSyncStateStore();

  const getConnectedSocketIdsInRoom = (roomId: RoomId): SocketId[] => {
    const room = roomManager.getRoomById(roomId);
    if (!room) {
      return [];
    }

    return room.players
      .map((player) => player.id)
      .filter((playerId) => !isBotPlayerId(playerId));
  };

  const getPlayersInRoom = (roomId: RoomId): domain.game.player.PlayerData[] => {
    const gameManager = runtimeRegistry.getGameManagerByRoomId(roomId);
    if (!gameManager) {
      return [];
    }

    return gameManager.getRoomPlayers();
  };

  const getAoiWindowForViewer = (
    viewer: domain.game.player.PlayerData,
  ): { minCol: number; maxCol: number; minRow: number; maxRow: number } => {
    const centerCell = domainNs.game.aoi.resolveAoiCellFromPosition(
      viewer.x,
      viewer.y,
      config.GAME_CONFIG.AOI_CELL_SIZE,
    );

    return domainNs.game.aoi.resolveAoiWindowFromCell(
      centerCell,
      config.GAME_CONFIG.AOI_WINDOW_COLS,
      config.GAME_CONFIG.AOI_WINDOW_ROWS,
    );
  };

  const isInViewerAoi = (
    target: { x: number; y: number },
    aoiWindow: { minCol: number; maxCol: number; minRow: number; maxRow: number },
  ): boolean => {
    return domainNs.game.aoi.isPositionInAoiWindow(
      target.x,
      target.y,
      aoiWindow,
      config.GAME_CONFIG.AOI_CELL_SIZE,
    );
  };

  const updateViewerAoiCellCache = (
    roomId: RoomId,
    viewerId: SocketId,
    viewer: domain.game.player.PlayerData,
  ): void => {
    const nextCell = domainNs.game.aoi.resolveAoiCellFromPosition(
      viewer.x,
      viewer.y,
      config.GAME_CONFIG.AOI_CELL_SIZE,
    );
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
    const visibleIdsCache = realtimeRoomSyncState.getVisiblePlayerIds(roomId, viewerId);
    const viewerPositionCache = realtimeRoomSyncState.getPlayerPositionCache(
      roomId,
      viewerId,
    );
    const nextVisibleIds = new Set(visiblePlayers.map((player) => player.id));

    visiblePlayers.forEach((player) => {
      if (!visibleIdsCache.has(player.id)) {
        reliable.emitToSocketById(viewerId, protocol.SocketEvents.NEW_PLAYER, player);
      }
    });

    visibleIdsCache.forEach((playerId) => {
      if (nextVisibleIds.has(playerId)) {
        return;
      }

      viewerPositionCache.delete(playerId);
      reliable.emitToSocketById(viewerId, protocol.SocketEvents.REMOVE_PLAYER, playerId);
    });

    visibleIdsCache.clear();
    nextVisibleIds.forEach((playerId) => {
      visibleIdsCache.add(playerId);
    });
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
      if (roomPlayers.length === 0) {
        return;
      }

      const quantizedPlayers = quantizeUpdatePlayersPayload(players);
      const roomPlayerById = new Map(roomPlayers.map((player) => [player.id, player]));
      const recipientSocketIds = getConnectedSocketIdsInRoom(roomId);

      recipientSocketIds.forEach((viewerId) => {
        const viewer = roomPlayerById.get(viewerId);
        if (!viewer) {
          return;
        }

        updateViewerAoiCellCache(roomId, viewerId, viewer);
        const aoiWindow = getAoiWindowForViewer(viewer);

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
      emitReliableToRoom(roomId, protocol.SocketEvents.CURRENT_HURRICANES, hurricanes);
    },
    publishUpdateHurricanesToRoom: (
      roomId: RoomId,
      hurricanes: UpdateHurricanesPayload,
    ) => {
      emitReliableToRoom(roomId, protocol.SocketEvents.UPDATE_HURRICANES, hurricanes);
    },
    publishGameEndToRoom: (roomId: RoomId) => {
      realtimeRoomSyncState.resetRoom(roomId);
      emitReliableToRoom(roomId, protocol.SocketEvents.GAME_END);
    },
    publishGameResultToRoom: (roomId: RoomId, payload: GameResultPayload) => {
      emitReliableToRoom(roomId, protocol.SocketEvents.GAME_RESULT, payload);
    },
    publishGameStartToRoom: (roomId: RoomId, payload: GameStartPayload) => {
      realtimeRoomSyncState.resetRoom(roomId);
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
      ownerSocketId: string,
      payload: BombPlacedPayload,
    ) => {
      const roomPlayers = getPlayersInRoom(roomId);
      if (roomPlayers.length === 0) {
        return;
      }

      const roomPlayerById = new Map(roomPlayers.map((player) => [player.id, player]));
      const recipientSocketIds = getConnectedSocketIdsInRoom(roomId);

      recipientSocketIds.forEach((viewerId) => {
        if (viewerId === ownerSocketId && !isBotPlayerId(ownerSocketId)) {
          return;
        }

        const viewer = roomPlayerById.get(viewerId);
        if (!viewer) {
          return;
        }

        updateViewerAoiCellCache(roomId, viewerId, viewer);
        const aoiWindow = getAoiWindowForViewer(viewer);
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
