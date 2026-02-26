/**
 * GameNetworkSync
 * ソケットイベントとゲーム内状態更新の同期を担う
 * プレイヤー生成更新削除とマップ更新購読を管理する
 */
import { Container } from "pixi.js";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  GameStartPayload,
  PlayerDeadPayload,
} from "@repo/shared";
import { AppearanceResolver } from "./AppearanceResolver";
import { GameMapController } from "@client/scenes/game/entities/map/GameMapController";
import {
  createNetworkSubscriptions,
  type SocketSubscriptionDictionary,
} from "./network/NetworkSubscriptions";
import {
  toBombPlacementAcknowledgedPayload,
  toGameStartedAt,
  toRemoteBombPlacedPayload,
  toRemotePlayerDeadPayload,
} from "./network/adapters/GameNetworkEventAdapter";
import { PlayerRepository } from "./player/PlayerRepository";
import { PlayerSyncHandler } from "./network/handlers/PlayerSyncHandler";
import { MapSyncHandler } from "./network/handlers/MapSyncHandler";
import { CombatSyncHandler } from "./network/handlers/CombatSyncHandler";
import type { GamePlayers } from "./game.types";

const ENABLE_DEBUG_LOG = import.meta.env.DEV;

type GameNetworkSyncOptions = {
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  gameMap: GameMapController;
  appearanceResolver: AppearanceResolver;
  onGameStarted: (startTime: number) => void;
  onGameEnded: () => void;
  onRemoteBombPlaced: (payload: BombPlacedPayload) => void;
  onBombPlacementAcknowledged: (payload: BombPlacedAckPayload) => void;
  onRemotePlayerDead: (payload: PlayerDeadPayload) => void;
};

/** ゲーム中のネットワークイベント購読と同期処理を管理する */
export class GameNetworkSync {
  private readonly playerRepository: PlayerRepository;
  private playerSyncHandler: PlayerSyncHandler;
  private mapSyncHandler: MapSyncHandler;
  private combatSyncHandler: CombatSyncHandler;
  private onGameStarted: (startTime: number) => void;
  private onGameEnded: () => void;
  private socketSubscriptions: SocketSubscriptionDictionary;
  private isBound = false;

  private debugLog = (message: string) => {
    if (!ENABLE_DEBUG_LOG) {
      return;
    }

    console.log(message);
  };

  private handleReceivedGameStart = (payload: GameStartPayload) => {
    const startTime = toGameStartedAt(payload);
    if (startTime !== null) {
      this.onGameStarted(startTime);
      this.debugLog(`[GameNetworkSync] ゲーム開始時刻同期完了: ${startTime}`);
    }
  };

  private handleReceivedGameEnd = () => {
    this.onGameEnded();
  };

  constructor({
    worldContainer,
    players,
    myId,
    gameMap,
    appearanceResolver,
    onGameStarted,
    onGameEnded,
    onRemoteBombPlaced,
    onBombPlacementAcknowledged,
    onRemotePlayerDead,
  }: GameNetworkSyncOptions) {
    this.playerRepository = new PlayerRepository(players);
    this.playerSyncHandler = new PlayerSyncHandler({
      worldContainer,
      playerRepository: this.playerRepository,
      myId,
      appearanceResolver,
    });
    this.mapSyncHandler = new MapSyncHandler({
      gameMap,
    });
    this.combatSyncHandler = new CombatSyncHandler({
      onRemoteBombPlaced: (payload) => {
        onRemoteBombPlaced(toRemoteBombPlacedPayload(payload));
      },
      onBombPlacementAcknowledged: (payload) => {
        onBombPlacementAcknowledged(toBombPlacementAcknowledgedPayload(payload));
      },
      onRemotePlayerDead: (payload) => {
        onRemotePlayerDead(toRemotePlayerDeadPayload(payload));
      },
    });
    this.onGameStarted = onGameStarted;
    this.onGameEnded = onGameEnded;
    this.socketSubscriptions = createNetworkSubscriptions({
      onCurrentPlayers: this.playerSyncHandler.handleCurrentPlayers,
      onNewPlayer: this.playerSyncHandler.handleNewPlayer,
      onGameStart: this.handleReceivedGameStart,
      onUpdatePlayers: this.playerSyncHandler.handlePlayerUpdates,
      onRemovePlayer: this.playerSyncHandler.handleRemovePlayer,
      onUpdateMapCells: this.mapSyncHandler.handleUpdateMapCells,
      onGameEnd: this.handleReceivedGameEnd,
      onBombPlaced: this.combatSyncHandler.handleReceivedBombPlaced,
      onBombPlacedAck: this.combatSyncHandler.handleReceivedBombPlacedAck,
      onPlayerDead: this.combatSyncHandler.handleReceivedPlayerDead,
    });
  }

  public bind() {
    if (this.isBound) return;

    Object.values(this.socketSubscriptions).forEach((subscription) => {
      subscription.bind();
    });

    this.isBound = true;
  }

  public unbind() {
    if (!this.isBound) return;

    Object.values(this.socketSubscriptions).forEach((subscription) => {
      subscription.unbind();
    });

    this.isBound = false;
  }
}
