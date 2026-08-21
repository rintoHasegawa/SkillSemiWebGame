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
  CurrentPlayersPayload,
  RemovePlayerPayload,
} from "@repo/shared";
import type {
  BombPlacementOutputPort,
  PlayerHitOutputPort,
  GameOutputPort,
} from "@server/domains/game/application/ports/gameUseCasePorts";
import { createRealtimeRoomSyncStateStore } from "@server/network/adapters/realtimeRoomSyncState";
import { createEmitToRoom } from "@server/network/adapters/socketEmitters";
import type { CommonHandlerContext } from "../CommonHandler";
import { resolveViewerAoiCell } from "./aoi/aoiVisibility";
import type { RuntimeResolverDeps } from "./runtime/gameRuntimeResolvers";
import { createBombSyncService } from "./services/bombSyncService";
import { createHurricaneSyncService } from "./services/hurricaneSyncService";
import { createPlayerSyncService } from "./services/playerSyncService";

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
  const realtimeRoomSyncState = createRealtimeRoomSyncStateStore();

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

  const bombSyncService = createBombSyncService({
    reliable,
    runtimeDeps: deps,
    realtimeRoomSyncState,
    updateViewerAoiCellCache,
  });
  const playerSyncService = createPlayerSyncService({
    reliable,
    runtimeDeps: deps,
    realtimeRoomSyncState,
    bombSyncService,
    updateViewerAoiCellCache,
  });
  const hurricaneSyncService = createHurricaneSyncService({
    reliable,
    runtimeDeps: deps,
    realtimeRoomSyncState,
    updateViewerAoiCellCache,
  });

  /**
   * ルームの同期状態をゲーム境界で初期化する
   * 可視集合とハリケーンスナップショットは片方だけ残ると前試合の状態を
   * 引き継ぐため，resetRoom と clearRoomSnapshot は常に対で呼ぶ
   */
  const resetRoomSyncState = (roomId: RoomId): void => {
    realtimeRoomSyncState.resetRoom(roomId);
    hurricaneSyncService.clearRoomSnapshot(roomId);
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
    publishUpdatePlayersToRoom: (roomId, players) => {
      playerSyncService.publishUpdatePlayersToRoom(roomId, players);
    },

    publishMapCellUpdatesToRoom: (
      roomId: RoomId,
      cellUpdates: domainNs.game.gridMap.CellUpdate[],
    ) => {
      const grouped = domainNs.game.gridMap.groupCellUpdates(cellUpdates);
      emitReliableToRoom(roomId, protocol.SocketEvents.UPDATE_MAP_CELLS, grouped);
    },
    publishCurrentHurricanesToRoom: (roomId, hurricanes) => {
      hurricaneSyncService.publishCurrentHurricanesToRoom(roomId, hurricanes);
    },
    publishUpdateHurricanesToRoom: (roomId, hurricanes, activeHurricaneIds) => {
      hurricaneSyncService.publishUpdateHurricanesToRoom(
        roomId,
        hurricanes,
        activeHurricaneIds,
      );
    },
    publishGameEndToRoom: (roomId: RoomId) => {
      resetRoomSyncState(roomId);
      emitReliableToRoom(roomId, protocol.SocketEvents.GAME_END);
    },
    publishGameResultToRoom: (roomId: RoomId, payload: GameResultPayload) => {
      emitReliableToRoom(roomId, protocol.SocketEvents.GAME_RESULT, payload);
    },
    publishGameStartToRoom: (roomId: RoomId, payload: GameStartPayload) => {
      resetRoomSyncState(roomId);
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
      bombSyncService.publishBombPlacedToOthersInRoom(
        roomId,
        excludedSocketId,
        payload,
      );
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
