/**
 * GameHandler
 * ゲーム関連のソケット購読と送信APIを提供する
 * シーン層が利用する通信操作を集約する
 */
import type { Socket } from "socket.io-client";
import { protocol } from "@repo/shared";
import type {
  BombHitReportPayload,
  BombPlacedAckPayload,
  BombPlacedPayload,
  CurrentPlayersPayload,
  GameResultPayload,
  GameStartPayload,
  MovePayload,
  NewPlayerPayload,
  PlaceBombPayload,
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
  onceGameStart: (callback: (data: GameStartPayload) => void) => void;
  offGameStart: (callback: (data: GameStartPayload) => void) => void;
  onGameEnd: (callback: () => void) => void;
  offGameEnd: (callback: () => void) => void;
  onGameResult: (callback: (payload: GameResultPayload) => void) => void;
  offGameResult: (callback: (payload: GameResultPayload) => void) => void;
  onBombPlaced: (callback: (payload: BombPlacedPayload) => void) => void;
  offBombPlaced: (callback: (payload: BombPlacedPayload) => void) => void;
  onBombPlacedAck: (callback: (payload: BombPlacedAckPayload) => void) => void;
  offBombPlacedAck: (callback: (payload: BombPlacedAckPayload) => void) => void;
  sendMove: (x: number, y: number) => void;
  sendPlaceBomb: (payload: PlaceBombPayload) => void;
  sendBombHitReport: (payload: BombHitReportPayload) => void;
  readyForGame: () => void;
};

/** ソケットインスタンスからゲーム向けハンドラを生成する */
export const createGameHandler = (socket: Socket): GameHandler => {
  const { onEvent, onceEvent, offEvent, emitEvent } = createClientSocketEventBridge(socket);

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
    onceGameStart: (callback) => {
      onceEvent(protocol.SocketEvents.GAME_START, callback);
    },
    offGameStart: (callback) => {
      offEvent(protocol.SocketEvents.GAME_START, callback);
    },
    onGameEnd: (callback) => {
      onEvent(protocol.SocketEvents.GAME_END, callback);
    },
    offGameEnd: (callback) => {
      offEvent(protocol.SocketEvents.GAME_END, callback);
    },
    onGameResult: (callback) => {
      onEvent(protocol.SocketEvents.GAME_RESULT, callback);
    },
    offGameResult: (callback) => {
      offEvent(protocol.SocketEvents.GAME_RESULT, callback);
    },
    onBombPlaced: (callback) => {
      onEvent(protocol.SocketEvents.BOMB_PLACED, callback);
    },
    offBombPlaced: (callback) => {
      offEvent(protocol.SocketEvents.BOMB_PLACED, callback);
    },
    onBombPlacedAck: (callback) => {
      onEvent(protocol.SocketEvents.BOMB_PLACED_ACK, callback);
    },
    offBombPlacedAck: (callback) => {
      offEvent(protocol.SocketEvents.BOMB_PLACED_ACK, callback);
    },
    sendMove: (x, y) => {
      const payload: MovePayload = { x, y };
      emitEvent(protocol.SocketEvents.MOVE, payload);
    },
    sendPlaceBomb: (payload) => {
      emitEvent(protocol.SocketEvents.PLACE_BOMB, payload);
    },
    sendBombHitReport: (payload) => {
      emitEvent(protocol.SocketEvents.BOMB_HIT_REPORT, payload);
    },
    readyForGame: () => {
      emitEvent(protocol.SocketEvents.READY_FOR_GAME);
    }
  };
};
