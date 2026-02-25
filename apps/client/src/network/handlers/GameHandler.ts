/**
 * GameHandler
 * ゲーム関連のソケット購読と送信APIを提供する
 * シーン層が利用する通信操作を集約する
 */
import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type {
  CurrentPlayersPayload,
  GameStartPayload,
  MovePayload,
  NewPlayerPayload,
  RemovePlayerPayload,
  UpdateMapCellsPayload,
  UpdatePlayersPayload,
} from "@repo/shared";
import { createClientSocketEventBridge } from "./socketEventBridge";

/** ゲームシーンが利用するソケット操作の契約 */
export type GameHandler = {
  onCurrentPlayers: (callback: (players: CurrentPlayersPayload) => void) => void;
  offCurrentPlayers: (callback: (players: CurrentPlayersPayload) => void) => void;
  onNewPlayer: (callback: (player: NewPlayerPayload) => void) => void;
  offNewPlayer: (callback: (player: NewPlayerPayload) => void) => void;
  onUpdatePlayers: (callback: (players: UpdatePlayersPayload) => void) => void;
  offUpdatePlayers: (callback: (players: UpdatePlayersPayload) => void) => void;
  onRemovePlayer: (callback: (id: RemovePlayerPayload) => void) => void;
  offRemovePlayer: (callback: (id: RemovePlayerPayload) => void) => void;
  onUpdateMapCells: (callback: (updates: UpdateMapCellsPayload) => void) => void;
  offUpdateMapCells: (callback: (updates: UpdateMapCellsPayload) => void) => void;
  onGameStart: (callback: (data: GameStartPayload) => void) => void;
  offGameStart: (callback: (data: GameStartPayload) => void) => void;
  sendMove: (x: number, y: number) => void;
  readyForGame: () => void;
};

/** ソケットインスタンスからゲーム向けハンドラを生成する */
export const createGameHandler = (socket: Socket): GameHandler => {
  const { onEvent, offEvent, emitEvent } = createClientSocketEventBridge(socket);

  return {
    onCurrentPlayers: (callback) => {
      onEvent(protocol.SocketEvents.CURRENT_PLAYERS, callback);
    },
    offCurrentPlayers: (callback) => {
      offEvent(protocol.SocketEvents.CURRENT_PLAYERS, callback);
    },
    onNewPlayer: (callback) => {
      onEvent(protocol.SocketEvents.NEW_PLAYER, callback);
    },
    offNewPlayer: (callback) => {
      offEvent(protocol.SocketEvents.NEW_PLAYER, callback);
    },
    onUpdatePlayers: (callback) => {
      onEvent(protocol.SocketEvents.UPDATE_PLAYERS, callback);
    },
    offUpdatePlayers: (callback) => {
      offEvent(protocol.SocketEvents.UPDATE_PLAYERS, callback);
    },
    onRemovePlayer: (callback) => {
      onEvent(protocol.SocketEvents.REMOVE_PLAYER, callback);
    },
    offRemovePlayer: (callback) => {
      offEvent(protocol.SocketEvents.REMOVE_PLAYER, callback);
    },
    onUpdateMapCells: (callback) => {
      onEvent(protocol.SocketEvents.UPDATE_MAP_CELLS, callback);
    },
    offUpdateMapCells: (callback) => {
      offEvent(protocol.SocketEvents.UPDATE_MAP_CELLS, callback);
    },
    onGameStart: (callback) => {
      onEvent(protocol.SocketEvents.GAME_START, callback);
    },
    offGameStart: (callback) => {
      offEvent(protocol.SocketEvents.GAME_START, callback);
    },
    sendMove: (x, y) => {
      const payload: MovePayload = { x, y };
      emitEvent(protocol.SocketEvents.MOVE, payload);
    },
    readyForGame: () => {
      emitEvent(protocol.SocketEvents.READY_FOR_GAME);
    }
  };
};
