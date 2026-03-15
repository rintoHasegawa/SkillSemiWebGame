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

type RoomId = domain.room.Room["roomId"];

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
): GameOutputAdapter => {
  const { reliable, realtime } = common;
  const realtimeRoomSyncState = createRealtimeRoomSyncStateStore();

  return {
    publishPongToSocket: (payload: PongPayload) => {
      reliable.emitToSocket(protocol.SocketEvents.PONG, payload);
    },
    publishUpdatePlayersToRoom: (
      roomId: RoomId,
      players: UpdatePlayersPayload,
    ) => {
      const quantizedPlayers = quantizeUpdatePlayersPayload(players);
      const changedPlayers = collectChangedUpdatePlayersPayload(
        quantizedPlayers,
        realtimeRoomSyncState.getPlayerPositionCache(roomId),
      );

      if (changedPlayers.length === 0) {
        return;
      }

      realtime.emitToRoom(
        roomId,
        protocol.SocketEvents.UPDATE_PLAYERS,
        changedPlayers,
      );
    },
    publishMapCellUpdatesToRoom: (
      roomId: RoomId,
      cellUpdates: domainNs.game.gridMap.CellUpdate[],
    ) => {
      const grouped = domainNs.game.gridMap.groupCellUpdates(cellUpdates);
      reliable.emitToRoom(
        roomId,
        protocol.SocketEvents.UPDATE_MAP_CELLS,
        grouped,
      );
    },
    publishUpdateHurricanesToRoom: (
      roomId: RoomId,
      hurricanes: UpdateHurricanesPayload,
    ) => {
      reliable.emitToRoom(
        roomId,
        protocol.SocketEvents.UPDATE_HURRICANES,
        hurricanes,
      );
    },
    publishInitialHurricanesToRoom: (
      roomId: RoomId,
      hurricanes: UpdateHurricanesPayload,
    ) => {
      reliable.emitToRoom(
        roomId,
        protocol.SocketEvents.UPDATE_HURRICANES,
        hurricanes,
      );
    },
    publishGameEndToRoom: (roomId: RoomId) => {
      realtimeRoomSyncState.resetRoom(roomId);
      reliable.emitToRoom(roomId, protocol.SocketEvents.GAME_END);
    },
    publishGameResultToRoom: (roomId: RoomId, payload: GameResultPayload) => {
      reliable.emitToRoom(roomId, protocol.SocketEvents.GAME_RESULT, payload);
    },
    publishGameStartToRoom: (roomId: RoomId, payload: GameStartPayload) => {
      realtimeRoomSyncState.resetRoom(roomId);
      reliable.emitToRoom(roomId, protocol.SocketEvents.GAME_START, payload);
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
      if (isBotPlayerId(ownerSocketId)) {
        reliable.emitToRoom(roomId, protocol.SocketEvents.BOMB_PLACED, payload);
        return;
      }

      reliable.emitToRoomExceptSocket(
        roomId,
        ownerSocketId,
        protocol.SocketEvents.BOMB_PLACED,
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
      reliable.emitToRoom(roomId, protocol.SocketEvents.HURRICANE_HIT, payload);
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
