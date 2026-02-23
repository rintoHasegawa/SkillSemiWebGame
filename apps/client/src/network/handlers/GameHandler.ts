import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type { playerTypes, gridMapTypes } from "@repo/shared";

type GameHandler = {
  onCurrentPlayers: (callback: (players: playerTypes.PlayerData[] | Record<string, playerTypes.PlayerData>) => void) => void;
  onNewPlayer: (callback: (player: playerTypes.PlayerData) => void) => void;
  onUpdatePlayer: (callback: (data: Partial<playerTypes.PlayerData> & { id: string }) => void) => void;
  onRemovePlayer: (callback: (id: string) => void) => void;
  onUpdateMapCells: (callback: (updates: gridMapTypes.CellUpdate[]) => void) => void;
  onGameStart: (callback: (data: { startTime: number }) => void) => void;
  sendMove: (x: number, y: number) => void;
  readyForGame: () => void;
  removeAllListeners: () => void;
};

export const createGameHandler = (socket: Socket): GameHandler => {
  return {
    onCurrentPlayers: (callback) => {
      socket.on(protocol.SocketEvents.CURRENT_PLAYERS, callback);
    },
    onNewPlayer: (callback) => {
      socket.on(protocol.SocketEvents.NEW_PLAYER, callback);
    },
    onUpdatePlayer: (callback) => {
      socket.on(protocol.SocketEvents.UPDATE_PLAYER, callback);
    },
    onRemovePlayer: (callback) => {
      socket.on(protocol.SocketEvents.REMOVE_PLAYER, callback);
    },
    onUpdateMapCells: (callback) => {
      socket.on(protocol.SocketEvents.UPDATE_MAP_CELLS, callback);
    },
    onGameStart: (callback) => {
      socket.on(protocol.SocketEvents.GAME_START, callback);
    },
    sendMove: (x, y) => {
      const payload: playerTypes.MovePayload = { x, y };
      socket.emit(protocol.SocketEvents.MOVE, payload);
    },
    readyForGame: () => {
      socket.emit(protocol.SocketEvents.READY_FOR_GAME);
    },
    removeAllListeners: () => {
      socket.off(protocol.SocketEvents.CURRENT_PLAYERS);
      socket.off(protocol.SocketEvents.NEW_PLAYER);
      socket.off(protocol.SocketEvents.UPDATE_PLAYER);
      socket.off(protocol.SocketEvents.REMOVE_PLAYER);
      socket.off(protocol.SocketEvents.UPDATE_MAP_CELLS);
    }
  };
};

export type { GameHandler };
