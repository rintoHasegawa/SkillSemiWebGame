/**
 * GameNetworkStateApplier
 * 受信イベントの状態反映を担当する
 * ハンドラ群とadapter適用を受信層から分離する
 */
import { Container } from "pixi.js";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  HurricaneHitPayload,
  PlayerHitPayload,
} from "@repo/shared";
import { domain } from "@repo/shared";
import { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";
import { GameMapController } from "@client/scenes/game/entities/map/GameMapController";
import { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";
import {
  toBombPlacementAcknowledgedPayload,
  toGameStartedAt,
  toRemoteBombPlacedPayload,
  toRemoteHurricaneHitPayload,
  toRemotePlayerHitPayload,
} from "@client/scenes/game/application/network/adapters/GameNetworkEventAdapter";
import { CombatSyncHandler } from "./CombatSyncHandler";
import { HurricaneSyncHandler } from "./HurricaneSyncHandler";
import { MapSyncHandler } from "./MapSyncHandler";
import { PlayerSyncHandler } from "./PlayerSyncHandler";
import type { ReceivedGameEventHandlers } from "../receivers/GameNetworkEventReceiver";

/** 状態反映処理の初期化入力 */
export type GameNetworkStateApplierOptions = {
  worldContainer: Container;
  playerRepository: PlayerRepository;
  myId: string;
  gameMap: GameMapController;
  appearanceResolver: AppearanceResolver;
  onGameStarted: (startTime: number) => void;
  onGameEnded: () => void;
  onRemoteBombPlaced: (payload: BombPlacedPayload) => void;
  onBombPlacementAcknowledged: (payload: BombPlacedAckPayload) => void;
  onRemotePlayerHit: (payload: PlayerHitPayload) => void;
  onRemoteHurricaneHit: (payload: HurricaneHitPayload) => void;
  onDebugLog?: (message: string) => void;
};

/** 受信イベントの状態反映を担当する */
export class GameNetworkStateApplier {
  private readonly playerSyncHandler: PlayerSyncHandler;
  private readonly mapSyncHandler: MapSyncHandler;
  private readonly combatSyncHandler: CombatSyncHandler;
  private readonly hurricaneSyncHandler: HurricaneSyncHandler;
  private readonly onGameStarted: (startTime: number) => void;
  private readonly onGameEnded: () => void;
  private readonly onDebugLog: (message: string) => void;
  private readonly receivedEventHandlers: ReceivedGameEventHandlers;

  constructor({
    worldContainer,
    playerRepository,
    myId,
    gameMap,
    appearanceResolver,
    onGameStarted,
    onGameEnded,
    onRemoteBombPlaced,
    onBombPlacementAcknowledged,
    onRemotePlayerHit,
    onRemoteHurricaneHit,
    onDebugLog,
  }: GameNetworkStateApplierOptions) {
    this.playerSyncHandler = new PlayerSyncHandler({
      worldContainer,
      playerRepository,
      myId,
      appearanceResolver,
    });
    this.mapSyncHandler = new MapSyncHandler({ gameMap });
    this.hurricaneSyncHandler = new HurricaneSyncHandler({ worldContainer });
    this.combatSyncHandler = new CombatSyncHandler({
      onRemoteBombPlaced: (payload) => {
        onRemoteBombPlaced(toRemoteBombPlacedPayload(payload));
      },
      onBombPlacementAcknowledged: (payload) => {
        onBombPlacementAcknowledged(
          toBombPlacementAcknowledgedPayload(payload),
        );
      },
      onRemotePlayerHit: (payload) => {
        onRemotePlayerHit(toRemotePlayerHitPayload(payload));
      },
      onRemoteHurricaneHit: (payload) => {
        onRemoteHurricaneHit(toRemoteHurricaneHitPayload(payload));
      },
    });
    this.onGameStarted = onGameStarted;
    this.onGameEnded = onGameEnded;
    this.onDebugLog = onDebugLog ?? (() => undefined);
    this.receivedEventHandlers = {
      onReceivedCurrentPlayers: (payload) => {
        this.playerSyncHandler.handleCurrentPlayers(payload);
      },
      onReceivedNewPlayer: (payload) => {
        this.playerSyncHandler.handleNewPlayer(payload);
      },
      onReceivedGameStart: (payload) => {
        const startTime = toGameStartedAt(payload);
        if (startTime === null) {
          return;
        }

        this.onGameStarted(startTime);
        this.onDebugLog(
          `[GameNetworkSync] ゲーム開始時刻同期完了: ${startTime}`,
        );
      },
      onReceivedUpdatePlayers: (payload) => {
        this.playerSyncHandler.handlePlayerUpdates(payload);
      },
      onReceivedRemovePlayer: (payload) => {
        this.playerSyncHandler.handleRemovePlayer(payload);
      },
      onReceivedUpdateMapCells: (payload) => {
        const updates = domain.game.gridMap.ungroupCellUpdates(payload);
        this.mapSyncHandler.handleUpdateMapCells(updates);
      },
      onReceivedUpdateHurricanes: (payload) => {
        this.hurricaneSyncHandler.handleUpdateHurricanes(payload);
      },
      onReceivedGameEnd: () => {
        this.onGameEnded();
      },
      onReceivedBombPlaced: (payload) => {
        this.combatSyncHandler.handleReceivedBombPlaced(payload);
      },
      onReceivedBombPlacedAck: (payload) => {
        this.combatSyncHandler.handleReceivedBombPlacedAck(payload);
      },
      onReceivedPlayerHit: (payload) => {
        this.combatSyncHandler.handleReceivedPlayerHit(payload);
      },
      onReceivedHurricaneHit: (payload) => {
        this.combatSyncHandler.handleReceivedHurricaneHit(payload);
      },
    };
  }

  /** 受信イベント配信先ハンドラ群を返す */
  public getReceivedEventHandlers(): ReceivedGameEventHandlers {
    return this.receivedEventHandlers;
  }

  /** 状態反映層が保持するリソースを破棄する */
  public dispose(): void {
    this.hurricaneSyncHandler.destroy();
  }
}
