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
  HurricaneHitPayload,
  NewPlayerPayload,
  PlayerHitPayload,
  PongPayload,
  RemovePlayerPayload,
  UpdateHurricanesPayload,
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
  updateHurricanes: SocketSubscription;
  gameEnd: SocketSubscription;
  bombPlaced: SocketSubscription;
  bombPlacedAck: SocketSubscription;
  playerHit: SocketSubscription;
  hurricaneHit: SocketSubscription;
  pong: SocketSubscription;
};

/** 購読辞書生成に必要なハンドラ群 */
export type NetworkSubscriptionHandlers = {
  onCurrentPlayers: (payload: CurrentPlayersPayload) => void;
  onNewPlayer: (payload: NewPlayerPayload) => void;
  onGameStart: (payload: GameStartPayload) => void;
  onUpdatePlayers: (payload: UpdatePlayersPayload) => void;
  onRemovePlayer: (payload: RemovePlayerPayload) => void;
  onUpdateMapCells: (payload: UpdateMapCellsPayload) => void;
  onUpdateHurricanes: (payload: UpdateHurricanesPayload) => void;
  onGameEnd: () => void;
  onBombPlaced: (payload: BombPlacedPayload) => void;
  onBombPlacedAck: (payload: BombPlacedAckPayload) => void;
  onPlayerHit: (payload: PlayerHitPayload) => void;
  onHurricaneHit: (payload: HurricaneHitPayload) => void;
  onPong: (payload: PongPayload) => void;
};

type SubscriptionDefinition = {
  key: keyof SocketSubscriptionDictionary;
  create: (handlers: NetworkSubscriptionHandlers) => SocketSubscription;
};

const SUBSCRIPTION_DEFINITIONS: SubscriptionDefinition[] = [
  {
    key: "currentPlayers",
    create: (handlers) => ({
      bind: () =>
        socketManager.game.onCurrentPlayers(handlers.onCurrentPlayers),
      unbind: () =>
        socketManager.game.offCurrentPlayers(handlers.onCurrentPlayers),
    }),
  },
  {
    key: "newPlayer",
    create: (handlers) => ({
      bind: () => socketManager.game.onNewPlayer(handlers.onNewPlayer),
      unbind: () => socketManager.game.offNewPlayer(handlers.onNewPlayer),
    }),
  },
  {
    key: "gameStart",
    create: (handlers) => ({
      bind: () => socketManager.game.onGameStart(handlers.onGameStart),
      unbind: () => socketManager.game.offGameStart(handlers.onGameStart),
    }),
  },
  {
    key: "updatePlayers",
    create: (handlers) => ({
      bind: () => socketManager.game.onUpdatePlayers(handlers.onUpdatePlayers),
      unbind: () =>
        socketManager.game.offUpdatePlayers(handlers.onUpdatePlayers),
    }),
  },
  {
    key: "removePlayer",
    create: (handlers) => ({
      bind: () => socketManager.game.onRemovePlayer(handlers.onRemovePlayer),
      unbind: () => socketManager.game.offRemovePlayer(handlers.onRemovePlayer),
    }),
  },
  {
    key: "updateMapCells",
    create: (handlers) => ({
      bind: () =>
        socketManager.game.onUpdateMapCells(handlers.onUpdateMapCells),
      unbind: () =>
        socketManager.game.offUpdateMapCells(handlers.onUpdateMapCells),
    }),
  },
  {
    key: "updateHurricanes",
    create: (handlers) => ({
      bind: () =>
        socketManager.game.onUpdateHurricanes(handlers.onUpdateHurricanes),
      unbind: () =>
        socketManager.game.offUpdateHurricanes(handlers.onUpdateHurricanes),
    }),
  },
  {
    key: "gameEnd",
    create: (handlers) => ({
      bind: () => socketManager.game.onGameEnd(handlers.onGameEnd),
      unbind: () => socketManager.game.offGameEnd(handlers.onGameEnd),
    }),
  },
  {
    key: "bombPlaced",
    create: (handlers) => ({
      bind: () => socketManager.game.onBombPlaced(handlers.onBombPlaced),
      unbind: () => socketManager.game.offBombPlaced(handlers.onBombPlaced),
    }),
  },
  {
    key: "bombPlacedAck",
    create: (handlers) => ({
      bind: () => socketManager.game.onBombPlacedAck(handlers.onBombPlacedAck),
      unbind: () =>
        socketManager.game.offBombPlacedAck(handlers.onBombPlacedAck),
    }),
  },
  {
    key: "playerHit",
    create: (handlers) => ({
      bind: () => socketManager.game.onPlayerHit(handlers.onPlayerHit),
      unbind: () => socketManager.game.offPlayerHit(handlers.onPlayerHit),
    }),
  },
  {
    key: "hurricaneHit",
    create: (handlers) => ({
      bind: () => socketManager.game.onHurricaneHit(handlers.onHurricaneHit),
      unbind: () => socketManager.game.offHurricaneHit(handlers.onHurricaneHit),
    }),
  },
  {
    key: "pong",
    create: (handlers) => ({
      bind: () => socketManager.game.onPong(handlers.onPong),
      unbind: () => socketManager.game.offPong(handlers.onPong),
    }),
  },
];

/** ソケット購読辞書を生成する */
export const createNetworkSubscriptions = (
  handlers: NetworkSubscriptionHandlers,
): SocketSubscriptionDictionary => {
  return SUBSCRIPTION_DEFINITIONS.reduce<SocketSubscriptionDictionary>(
    (dictionary, definition) => {
      dictionary[definition.key] = definition.create(handlers);
      return dictionary;
    },
    {} as SocketSubscriptionDictionary,
  );
};
