/**
 * GameNetworkEventReceiver
 * 受信イベント購読と配信を担当する
 * bindとunbindの管理を受信層へ分離する
 */
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
import {
  createNetworkSubscriptions,
  type SocketSubscriptionDictionary,
} from "@client/scenes/game/application/network/NetworkSubscriptions";

/** 受信イベント配信先のハンドラ群 */
export type ReceivedGameEventHandlers = {
  onReceivedCurrentPlayers: (payload: CurrentPlayersPayload) => void;
  onReceivedNewPlayer: (payload: NewPlayerPayload) => void;
  onReceivedGameStart: (payload: GameStartPayload) => void;
  onReceivedUpdatePlayers: (payload: UpdatePlayersPayload) => void;
  onReceivedRemovePlayer: (payload: RemovePlayerPayload) => void;
  onReceivedUpdateMapCells: (payload: UpdateMapCellsPayload) => void;
  onReceivedUpdateHurricanes: (payload: UpdateHurricanesPayload) => void;
  onReceivedGameEnd: () => void;
  onReceivedBombPlaced: (payload: BombPlacedPayload) => void;
  onReceivedBombPlacedAck: (payload: BombPlacedAckPayload) => void;
  onReceivedPlayerHit: (payload: PlayerHitPayload) => void;
  onReceivedHurricaneHit: (payload: HurricaneHitPayload) => void;
  onReceivedPong: (payload: PongPayload) => void;
};

/** 受信イベント購読の管理を担当する */
export class GameNetworkEventReceiver {
  private readonly socketSubscriptions: SocketSubscriptionDictionary;
  private isBound = false;

  constructor(handlers: ReceivedGameEventHandlers) {
    this.socketSubscriptions = createNetworkSubscriptions({
      onCurrentPlayers: handlers.onReceivedCurrentPlayers,
      onNewPlayer: handlers.onReceivedNewPlayer,
      onGameStart: handlers.onReceivedGameStart,
      onUpdatePlayers: handlers.onReceivedUpdatePlayers,
      onRemovePlayer: handlers.onReceivedRemovePlayer,
      onUpdateMapCells: handlers.onReceivedUpdateMapCells,
      onUpdateHurricanes: handlers.onReceivedUpdateHurricanes,
      onGameEnd: handlers.onReceivedGameEnd,
      onBombPlaced: handlers.onReceivedBombPlaced,
      onBombPlacedAck: handlers.onReceivedBombPlacedAck,
      onPlayerHit: handlers.onReceivedPlayerHit,
      onHurricaneHit: handlers.onReceivedHurricaneHit,
      onPong: handlers.onReceivedPong,
    });
  }

  /** 受信イベント購読を開始する */
  public bind(): void {
    if (this.isBound) {
      return;
    }

    Object.values(this.socketSubscriptions).forEach((subscription) => {
      subscription.bind();
    });

    this.isBound = true;
  }

  /** 受信イベント購読を解除する */
  public unbind(): void {
    if (!this.isBound) {
      return;
    }

    Object.values(this.socketSubscriptions).forEach((subscription) => {
      subscription.unbind();
    });

    this.isBound = false;
  }
}
