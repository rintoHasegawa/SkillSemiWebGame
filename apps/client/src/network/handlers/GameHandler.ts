/**
 * GameHandler
 * ゲーム関連のソケット購読と送信APIを提供する
 * シーン層が利用する通信操作を集約する
 */
import type { Socket } from "socket.io-client";
import { contracts as protocol } from "@repo/shared";
import type {
  BombHitReportPayload,
  BombPlacedAckPayload,
  BombPlacedPayload,
  ClientToServerEventPayloadMap,
  ServerToClientEventPayloadMap,
  CurrentPlayersPayload,
  GameResultPayload,
  GameStartPayload,
  HurricaneHitPayload,
  MovePayload,
  NewPlayerPayload,
  PlaceBombPayload,
  PlayerHitPayload,
  RemovePlayerPayload,
  UpdateHurricanesPayload,
  UpdateMapCellsPayload,
  UpdatePlayersPayload,
} from "@repo/shared";
import { createClientSocketEventBridge } from "./socketEventBridge";

/** ゲームシーンが利用するソケット操作の契約 */
export type GameHandler = {
  onCurrentPlayers: (
    callback: (players: CurrentPlayersPayload) => void,
  ) => void;
  offCurrentPlayers: (
    callback: (players: CurrentPlayersPayload) => void,
  ) => void;
  onNewPlayer: (callback: (player: NewPlayerPayload) => void) => void;
  offNewPlayer: (callback: (player: NewPlayerPayload) => void) => void;
  onUpdatePlayers: (callback: (players: UpdatePlayersPayload) => void) => void;
  offUpdatePlayers: (callback: (players: UpdatePlayersPayload) => void) => void;
  onRemovePlayer: (callback: (id: RemovePlayerPayload) => void) => void;
  offRemovePlayer: (callback: (id: RemovePlayerPayload) => void) => void;
  onUpdateMapCells: (
    callback: (updates: UpdateMapCellsPayload) => void,
  ) => void;
  offUpdateMapCells: (
    callback: (updates: UpdateMapCellsPayload) => void,
  ) => void;
  onUpdateHurricanes: (
    callback: (payload: UpdateHurricanesPayload) => void,
  ) => void;
  offUpdateHurricanes: (
    callback: (payload: UpdateHurricanesPayload) => void,
  ) => void;
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
  onPlayerHit: (callback: (payload: PlayerHitPayload) => void) => void;
  offPlayerHit: (callback: (payload: PlayerHitPayload) => void) => void;
  onHurricaneHit: (callback: (payload: HurricaneHitPayload) => void) => void;
  offHurricaneHit: (callback: (payload: HurricaneHitPayload) => void) => void;
  sendMove: (x: number, y: number) => void;
  sendPlaceBomb: (payload: PlaceBombPayload) => void;
  sendBombHitReport: (payload: BombHitReportPayload) => void;
  readyForGame: () => void;
};

/** ソケットインスタンスからゲーム向けハンドラを生成する */
export const createGameHandler = (socket: Socket): GameHandler => {
  const { onEvent, onceEvent, offEvent, emitEvent } =
    createClientSocketEventBridge(socket);
  type ReceiveEventName = Extract<keyof ServerToClientEventPayloadMap, string>;
  type SendEventName = Extract<keyof ClientToServerEventPayloadMap, string>;

  const createSubscriptionPair = <TEvent extends ReceiveEventName>(
    event: TEvent,
  ) => {
    return {
      on: (
        callback: (payload: ServerToClientEventPayloadMap[TEvent]) => void,
      ) => {
        onEvent(event, callback);
      },
      off: (
        callback: (payload: ServerToClientEventPayloadMap[TEvent]) => void,
      ) => {
        offEvent(event, callback);
      },
    };
  };

  const createPayloadSender = <TEvent extends SendEventName>(event: TEvent) => {
    return (payload: ClientToServerEventPayloadMap[TEvent]) => {
      emitEvent(event, payload);
    };
  };

  const createVoidSender = <TEvent extends SendEventName>(event: TEvent) => {
    return () => {
      emitEvent(event);
    };
  };

  const currentPlayersSubscription = createSubscriptionPair(
    protocol.SocketEvents.CURRENT_PLAYERS,
  );
  const newPlayerSubscription = createSubscriptionPair(
    protocol.SocketEvents.NEW_PLAYER,
  );
  const updatePlayersSubscription = createSubscriptionPair(
    protocol.SocketEvents.UPDATE_PLAYERS,
  );
  const removePlayerSubscription = createSubscriptionPair(
    protocol.SocketEvents.REMOVE_PLAYER,
  );
  const updateMapCellsSubscription = createSubscriptionPair(
    protocol.SocketEvents.UPDATE_MAP_CELLS,
  );
  const updateHurricanesSubscription = createSubscriptionPair(
    protocol.SocketEvents.UPDATE_HURRICANES,
  );
  const gameEndSubscription = createSubscriptionPair(
    protocol.SocketEvents.GAME_END,
  );
  const gameResultSubscription = createSubscriptionPair(
    protocol.SocketEvents.GAME_RESULT,
  );
  const bombPlacedSubscription = createSubscriptionPair(
    protocol.SocketEvents.BOMB_PLACED,
  );
  const bombPlacedAckSubscription = createSubscriptionPair(
    protocol.SocketEvents.BOMB_PLACED_ACK,
  );
  const playerHitSubscription = createSubscriptionPair(
    protocol.SocketEvents.PLAYER_HIT,
  );
  const hurricaneHitSubscription = createSubscriptionPair(
    protocol.SocketEvents.HURRICANE_HIT,
  );
  const sendMovePayload = createPayloadSender(protocol.SocketEvents.MOVE);
  const sendPlaceBombPayload = createPayloadSender(
    protocol.SocketEvents.PLACE_BOMB,
  );
  const sendBombHitReportPayload = createPayloadSender(
    protocol.SocketEvents.BOMB_HIT_REPORT,
  );
  const sendReadyForGame = createVoidSender(
    protocol.SocketEvents.READY_FOR_GAME,
  );

  return {
    onCurrentPlayers: (callback) => {
      currentPlayersSubscription.on(callback);
    },
    offCurrentPlayers: (callback) => {
      currentPlayersSubscription.off(callback);
    },
    onNewPlayer: (callback) => {
      newPlayerSubscription.on(callback);
    },
    offNewPlayer: (callback) => {
      newPlayerSubscription.off(callback);
    },
    onUpdatePlayers: (callback) => {
      updatePlayersSubscription.on(callback);
    },
    offUpdatePlayers: (callback) => {
      updatePlayersSubscription.off(callback);
    },
    onRemovePlayer: (callback) => {
      removePlayerSubscription.on(callback);
    },
    offRemovePlayer: (callback) => {
      removePlayerSubscription.off(callback);
    },
    onUpdateMapCells: (callback) => {
      updateMapCellsSubscription.on(callback);
    },
    offUpdateMapCells: (callback) => {
      updateMapCellsSubscription.off(callback);
    },
    onUpdateHurricanes: (callback) => {
      updateHurricanesSubscription.on(callback);
    },
    offUpdateHurricanes: (callback) => {
      updateHurricanesSubscription.off(callback);
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
      gameEndSubscription.on(callback);
    },
    offGameEnd: (callback) => {
      gameEndSubscription.off(callback);
    },
    onGameResult: (callback) => {
      gameResultSubscription.on(callback);
    },
    offGameResult: (callback) => {
      gameResultSubscription.off(callback);
    },
    onBombPlaced: (callback) => {
      bombPlacedSubscription.on(callback);
    },
    offBombPlaced: (callback) => {
      bombPlacedSubscription.off(callback);
    },
    onBombPlacedAck: (callback) => {
      bombPlacedAckSubscription.on(callback);
    },
    offBombPlacedAck: (callback) => {
      bombPlacedAckSubscription.off(callback);
    },
    onPlayerHit: (callback) => {
      playerHitSubscription.on(callback);
    },
    offPlayerHit: (callback) => {
      playerHitSubscription.off(callback);
    },
    onHurricaneHit: (callback) => {
      hurricaneHitSubscription.on(callback);
    },
    offHurricaneHit: (callback) => {
      hurricaneHitSubscription.off(callback);
    },
    sendMove: (x, y) => {
      const payload: MovePayload = { x, y };
      sendMovePayload(payload);
    },
    sendPlaceBomb: (payload) => {
      sendPlaceBombPayload(payload);
    },
    sendBombHitReport: (payload) => {
      sendBombHitReportPayload(payload);
    },
    readyForGame: () => {
      sendReadyForGame();
    },
  };
};
