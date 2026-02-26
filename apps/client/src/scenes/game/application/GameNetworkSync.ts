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
  onGameStart: (startTime: number) => void;
  onGameEnd: () => void;
  onBombPlacedFromOthers: (payload: BombPlacedPayload) => void;
  onBombPlacedAckFromNetwork: (payload: BombPlacedAckPayload) => void;
  onPlayerDeadFromNetwork: (payload: PlayerDeadPayload) => void;
};

/** ゲーム中のネットワークイベント購読と同期処理を管理する */
export class GameNetworkSync {
  private playerSyncHandler: PlayerSyncHandler;
  private mapSyncHandler: MapSyncHandler;
  private combatSyncHandler: CombatSyncHandler;
  private onGameStart: (startTime: number) => void;
  private onGameEnd: () => void;
  private socketSubscriptions: SocketSubscriptionDictionary;
  private isBound = false;

  private debugLog = (message: string) => {
    if (!ENABLE_DEBUG_LOG) {
      return;
    }

    console.log(message);
  };

  private handleGameStart = (data: GameStartPayload) => {
    if (data && data.startTime) {
      this.onGameStart(data.startTime);
      this.debugLog(`[GameNetworkSync] ゲーム開始時刻同期完了: ${data.startTime}`);
    }
  };

  private handleGameEnd = () => {
    this.onGameEnd();
  };

  constructor({
    worldContainer,
    players,
    myId,
    gameMap,
    appearanceResolver,
    onGameStart,
    onGameEnd,
    onBombPlacedFromOthers,
    onBombPlacedAckFromNetwork,
    onPlayerDeadFromNetwork,
  }: GameNetworkSyncOptions) {
    this.playerSyncHandler = new PlayerSyncHandler({
      worldContainer,
      players,
      myId,
      appearanceResolver,
    });
    this.mapSyncHandler = new MapSyncHandler({
      gameMap,
    });
    this.combatSyncHandler = new CombatSyncHandler({
      onBombPlacedFromOthers,
      onBombPlacedAckFromNetwork,
      onPlayerDeadFromNetwork,
    });
    this.onGameStart = onGameStart;
    this.onGameEnd = onGameEnd;
    this.socketSubscriptions = createNetworkSubscriptions({
      onCurrentPlayers: this.playerSyncHandler.handleCurrentPlayers,
      onNewPlayer: this.playerSyncHandler.handleNewPlayer,
      onGameStart: this.handleGameStart,
      onUpdatePlayers: this.playerSyncHandler.handlePlayerUpdates,
      onRemovePlayer: this.playerSyncHandler.handleRemovePlayer,
      onUpdateMapCells: this.mapSyncHandler.handleUpdateMapCells,
      onGameEnd: this.handleGameEnd,
      onBombPlaced: this.combatSyncHandler.handleBombPlaced,
      onBombPlacedAck: this.combatSyncHandler.handleBombPlacedAck,
      onPlayerDead: this.combatSyncHandler.handlePlayerDead,
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
