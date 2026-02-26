/**
 * NetworkSubscriptions
 * ゲーム中のソケット購読定義を辞書形式で生成する
 * bind と unbind の対応関係を一元管理する
 */
import { socketManager } from "@client/network/SocketManager";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  CurrentPlayersPayload,
  GameStartPayload,
  NewPlayerPayload,
  PlayerDeadPayload,
  RemovePlayerPayload,
  UpdateMapCellsPayload,
  UpdatePlayersPayload,
} from "@repo/shared";

/** ソケット購読の bind と unbind を保持する型 */
export type SocketSubscription = {
  bind: () => void;
  unbind: () => void;
};

/** ゲーム中に利用する購読辞書の型 */
export type SocketSubscriptionDictionary = {
  currentPlayers: SocketSubscription;
  newPlayer: SocketSubscription;
  gameStart: SocketSubscription;
  updatePlayers: SocketSubscription;
  removePlayer: SocketSubscription;
  updateMapCells: SocketSubscription;
  gameEnd: SocketSubscription;
  bombPlaced: SocketSubscription;
  bombPlacedAck: SocketSubscription;
  playerDead: SocketSubscription;
};

/** 購読辞書生成に必要なハンドラ群 */
export type NetworkSubscriptionHandlers = {
  onCurrentPlayers: (payload: CurrentPlayersPayload) => void;
  onNewPlayer: (payload: NewPlayerPayload) => void;
  onGameStart: (payload: GameStartPayload) => void;
  onUpdatePlayers: (payload: UpdatePlayersPayload) => void;
  onRemovePlayer: (payload: RemovePlayerPayload) => void;
  onUpdateMapCells: (payload: UpdateMapCellsPayload) => void;
  onGameEnd: () => void;
  onBombPlaced: (payload: BombPlacedPayload) => void;
  onBombPlacedAck: (payload: BombPlacedAckPayload) => void;
  onPlayerDead: (payload: PlayerDeadPayload) => void;
};

/** ソケット購読辞書を生成する */
export const createNetworkSubscriptions = (
  handlers: NetworkSubscriptionHandlers,
): SocketSubscriptionDictionary => {
  return {
    currentPlayers: {
      bind: () => socketManager.game.onCurrentPlayers(handlers.onCurrentPlayers),
      unbind: () => socketManager.game.offCurrentPlayers(handlers.onCurrentPlayers),
    },
    newPlayer: {
      bind: () => socketManager.game.onNewPlayer(handlers.onNewPlayer),
      unbind: () => socketManager.game.offNewPlayer(handlers.onNewPlayer),
    },
    gameStart: {
      bind: () => socketManager.game.onGameStart(handlers.onGameStart),
      unbind: () => socketManager.game.offGameStart(handlers.onGameStart),
    },
    updatePlayers: {
      bind: () => socketManager.game.onUpdatePlayers(handlers.onUpdatePlayers),
      unbind: () => socketManager.game.offUpdatePlayers(handlers.onUpdatePlayers),
    },
    removePlayer: {
      bind: () => socketManager.game.onRemovePlayer(handlers.onRemovePlayer),
      unbind: () => socketManager.game.offRemovePlayer(handlers.onRemovePlayer),
    },
    updateMapCells: {
      bind: () => socketManager.game.onUpdateMapCells(handlers.onUpdateMapCells),
      unbind: () => socketManager.game.offUpdateMapCells(handlers.onUpdateMapCells),
    },
    gameEnd: {
      bind: () => socketManager.game.onGameEnd(handlers.onGameEnd),
      unbind: () => socketManager.game.offGameEnd(handlers.onGameEnd),
    },
    bombPlaced: {
      bind: () => socketManager.game.onBombPlaced(handlers.onBombPlaced),
      unbind: () => socketManager.game.offBombPlaced(handlers.onBombPlaced),
    },
    bombPlacedAck: {
      bind: () => socketManager.game.onBombPlacedAck(handlers.onBombPlacedAck),
      unbind: () => socketManager.game.offBombPlacedAck(handlers.onBombPlacedAck),
    },
    playerDead: {
      bind: () => socketManager.game.onPlayerDead(handlers.onPlayerDead),
      unbind: () => socketManager.game.offPlayerDead(handlers.onPlayerDead),
    },
  };
};