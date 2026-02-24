import { Server } from "socket.io";
import { protocol } from "@repo/shared";
import type { gridMapTypes, playerTypes } from "@repo/shared";
import { createEmitToAll } from "@server/network/adapters/socketEmitters";
import type { CommonHandlerContext } from "../CommonHandler";

export type GameEventPublisher = {
  publishPong: (payload: { clientTime: number; serverTime: number }) => void;
  publishUpdatePlayer: (roomId: string, playerData: playerTypes.PlayerData) => void;
  publishMapCellUpdates: (roomId: string, cellUpdates: gridMapTypes.CellUpdate[]) => void;
  publishGameEnd: (roomId: string) => void;
  publishGameStartToRoom: (roomId: string, payload: { startTime: number }) => void;
  publishCurrentPlayers: (players: playerTypes.PlayerData[]) => void;
  publishGameStartToSocket: (payload: { startTime: number }) => void;
};

export type GameDisconnectPublisher = {
  publishPlayerRemoved: (removedPlayerId: string) => void;
};

export const createGameEventPublisher = (common: CommonHandlerContext): GameEventPublisher => {
  return {
    publishPong: (payload: { clientTime: number; serverTime: number }) => {
      common.emitToSocket(protocol.SocketEvents.PONG, payload);
    },
    publishUpdatePlayer: (roomId: string, playerData: playerTypes.PlayerData) => {
      common.emitToRoom(roomId, protocol.SocketEvents.UPDATE_PLAYER, playerData);
    },
    publishMapCellUpdates: (roomId: string, cellUpdates: gridMapTypes.CellUpdate[]) => {
      common.emitToRoom(roomId, protocol.SocketEvents.UPDATE_MAP_CELLS, cellUpdates);
    },
    publishGameEnd: (roomId: string) => {
      common.emitToRoom(roomId, protocol.SocketEvents.GAME_END);
    },
    publishGameStartToRoom: (roomId: string, payload: { startTime: number }) => {
      common.emitToRoom(roomId, protocol.SocketEvents.GAME_START, payload);
    },
    publishCurrentPlayers: (players: playerTypes.PlayerData[]) => {
      common.emitToSocket(protocol.SocketEvents.CURRENT_PLAYERS, players);
    },
    publishGameStartToSocket: (payload: { startTime: number }) => {
      common.emitToSocket(protocol.SocketEvents.GAME_START, payload);
    },
  };
};

export const createGameDisconnectPublisher = (io: Server): GameDisconnectPublisher => {
  const emitToAll = createEmitToAll(io);

  return {
    publishPlayerRemoved: (removedPlayerId: string) => {
      emitToAll(protocol.SocketEvents.REMOVE_PLAYER, removedPlayerId);
    },
  };
};
