import { Server } from "socket.io";
import { protocol } from "@repo/shared";
import type { gridMapTypes, playerTypes } from "@repo/shared";
import { createEmitToAll } from "@server/network/adapters/socketEmitters";
import type { CommonHandlerContext } from "../CommonHandler";

type RoomId = string;
type SocketId = string;
type PongPayload = { clientTime: number; serverTime: number };
type GameStartPayload = { startTime: number };
type CurrentPlayersPayload = playerTypes.PlayerData[];
type UpdatePlayerPayload = playerTypes.PlayerData;
type MapCellUpdatesPayload = gridMapTypes.CellUpdate[];

export type GameEventPublisher = {
  publishPongToSocket: (payload: PongPayload) => void;
  publishUpdatePlayerToRoom: (roomId: RoomId, playerData: UpdatePlayerPayload) => void;
  publishMapCellUpdatesToRoom: (roomId: RoomId, cellUpdates: MapCellUpdatesPayload) => void;
  publishGameEndToRoom: (roomId: RoomId) => void;
  publishGameStartToRoom: (roomId: RoomId, payload: GameStartPayload) => void;
  publishCurrentPlayersToSocket: (players: CurrentPlayersPayload) => void;
  publishGameStartToSocket: (payload: GameStartPayload) => void;
};

export type GameDisconnectPublisher = {
  publishPlayerRemovedToAll: (removedPlayerId: SocketId) => void;
};

export const createGameEventPublisher = (common: CommonHandlerContext): GameEventPublisher => {
  return {
    publishPongToSocket: (payload: PongPayload) => {
      common.emitToSocket(protocol.SocketEvents.PONG, payload);
    },
    publishUpdatePlayerToRoom: (roomId: RoomId, playerData: UpdatePlayerPayload) => {
      common.emitToRoom(roomId, protocol.SocketEvents.UPDATE_PLAYER, playerData);
    },
    publishMapCellUpdatesToRoom: (roomId: RoomId, cellUpdates: MapCellUpdatesPayload) => {
      common.emitToRoom(roomId, protocol.SocketEvents.UPDATE_MAP_CELLS, cellUpdates);
    },
    publishGameEndToRoom: (roomId: RoomId) => {
      common.emitToRoom(roomId, protocol.SocketEvents.GAME_END);
    },
    publishGameStartToRoom: (roomId: RoomId, payload: GameStartPayload) => {
      common.emitToRoom(roomId, protocol.SocketEvents.GAME_START, payload);
    },
    publishCurrentPlayersToSocket: (players: CurrentPlayersPayload) => {
      common.emitToSocket(protocol.SocketEvents.CURRENT_PLAYERS, players);
    },
    publishGameStartToSocket: (payload: GameStartPayload) => {
      common.emitToSocket(protocol.SocketEvents.GAME_START, payload);
    },
  };
};

export const createGameDisconnectPublisher = (io: Server): GameDisconnectPublisher => {
  const emitToAll = createEmitToAll(io);

  return {
    publishPlayerRemovedToAll: (removedPlayerId: SocketId) => {
      emitToAll(protocol.SocketEvents.REMOVE_PLAYER, removedPlayerId);
    },
  };
};
