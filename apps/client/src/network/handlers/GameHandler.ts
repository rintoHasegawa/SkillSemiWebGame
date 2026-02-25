/**
 * GameHandler
 * ゲーム関連のソケット購読と送信APIを提供する
 * シーン層が利用する通信操作を集約する
 */
import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type {
  playerTypes,
  CurrentPlayersPayload,
  UpdateMapCellsPayload,
  UpdatePlayersPayload,
} from "@repo/shared";

/** ゲームシーンが利用するソケット操作の契約 */
export type GameHandler = {
  onCurrentPlayers: (callback: (players: CurrentPlayersPayload) => void) => void;
  offCurrentPlayers: (callback: (players: CurrentPlayersPayload) => void) => void;
  onNewPlayer: (callback: (player: playerTypes.PlayerData) => void) => void;
  offNewPlayer: (callback: (player: playerTypes.PlayerData) => void) => void;
  onUpdatePlayers: (callback: (players: UpdatePlayersPayload) => void) => void;
  offUpdatePlayers: (callback: (players: UpdatePlayersPayload) => void) => void;
  onRemovePlayer: (callback: (id: string) => void) => void;
  offRemovePlayer: (callback: (id: string) => void) => void;
  onUpdateMapCells: (callback: (updates: UpdateMapCellsPayload) => void) => void;
  offUpdateMapCells: (callback: (updates: UpdateMapCellsPayload) => void) => void;
  onGameStart: (callback: (data: { startTime: number }) => void) => void;
  offGameStart: (callback: (data: { startTime: number }) => void) => void;
  sendMove: (x: number, y: number) => void;
  readyForGame: () => void;
};

/** ソケットインスタンスからゲーム向けハンドラを生成する */
export const createGameHandler = (socket: Socket): GameHandler => {
  return {
    onCurrentPlayers: (callback) => {
      socket.on(protocol.SocketEvents.CURRENT_PLAYERS, callback);
    },
    offCurrentPlayers: (callback) => {
      socket.off(protocol.SocketEvents.CURRENT_PLAYERS, callback);
    },
    onNewPlayer: (callback) => {
      socket.on(protocol.SocketEvents.NEW_PLAYER, callback);
    },
    offNewPlayer: (callback) => {
      socket.off(protocol.SocketEvents.NEW_PLAYER, callback);
    },
    onUpdatePlayers: (callback) => {
      socket.on(protocol.SocketEvents.UPDATE_PLAYERS, callback);
    },
    offUpdatePlayers: (callback) => {
      socket.off(protocol.SocketEvents.UPDATE_PLAYERS, callback);
    },
    onRemovePlayer: (callback) => {
      socket.on(protocol.SocketEvents.REMOVE_PLAYER, callback);
    },
    offRemovePlayer: (callback) => {
      socket.off(protocol.SocketEvents.REMOVE_PLAYER, callback);
    },
    onUpdateMapCells: (callback) => {
      socket.on(protocol.SocketEvents.UPDATE_MAP_CELLS, callback);
    },
    offUpdateMapCells: (callback) => {
      socket.off(protocol.SocketEvents.UPDATE_MAP_CELLS, callback);
    },
    onGameStart: (callback) => {
      socket.on(protocol.SocketEvents.GAME_START, callback);
    },
    offGameStart: (callback) => {
      socket.off(protocol.SocketEvents.GAME_START, callback);
    },
    sendMove: (x, y) => {
      const payload: playerTypes.MovePayload = { x, y };
      socket.emit(protocol.SocketEvents.MOVE, payload);
    },
    readyForGame: () => {
      socket.emit(protocol.SocketEvents.READY_FOR_GAME);
    }
  };
};
