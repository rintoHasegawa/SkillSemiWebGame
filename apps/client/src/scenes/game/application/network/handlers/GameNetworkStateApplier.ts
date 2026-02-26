/**
 * GameNetworkStateApplier
 * 受信イベントの状態反映を担当する
 * ハンドラ群とadapter適用を受信層から分離する
 */
import { Container } from "pixi.js";
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
import { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";
import { GameMapController } from "@client/scenes/game/entities/map/GameMapController";
import { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";
import {
  toBombPlacementAcknowledgedPayload,
  toGameStartedAt,
  toRemoteBombPlacedPayload,
  toRemotePlayerDeadPayload,
} from "@client/scenes/game/application/network/adapters/GameNetworkEventAdapter";
import { CombatSyncHandler } from "./CombatSyncHandler";
import { MapSyncHandler } from "./MapSyncHandler";
import { PlayerSyncHandler } from "./PlayerSyncHandler";

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
  onRemotePlayerDead: (payload: PlayerDeadPayload) => void;
  onDebugLog?: (message: string) => void;
};

/** 受信イベントの状態反映を担当する */
export class GameNetworkStateApplier {
  private readonly playerSyncHandler: PlayerSyncHandler;
  private readonly mapSyncHandler: MapSyncHandler;
  private readonly combatSyncHandler: CombatSyncHandler;
  private readonly onGameStarted: (startTime: number) => void;
  private readonly onGameEnded: () => void;
  private readonly onDebugLog: (message: string) => void;

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
    onRemotePlayerDead,
    onDebugLog,
  }: GameNetworkStateApplierOptions) {
    this.playerSyncHandler = new PlayerSyncHandler({
      worldContainer,
      playerRepository,
      myId,
      appearanceResolver,
    });
    this.mapSyncHandler = new MapSyncHandler({ gameMap });
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
    this.onDebugLog = onDebugLog ?? (() => undefined);
  }

  /** 初期プレイヤー一覧の受信イベントを適用する */
  public applyReceivedCurrentPlayers(payload: CurrentPlayersPayload): void {
    this.playerSyncHandler.handleCurrentPlayers(payload);
  }

  /** 新規参加プレイヤー受信イベントを適用する */
  public applyReceivedNewPlayer(payload: NewPlayerPayload): void {
    this.playerSyncHandler.handleNewPlayer(payload);
  }

  /** ゲーム開始受信イベントを適用する */
  public applyReceivedGameStart(payload: GameStartPayload): void {
    const startTime = toGameStartedAt(payload);
    if (startTime === null) {
      return;
    }

    this.onGameStarted(startTime);
    this.onDebugLog(`[GameNetworkSync] ゲーム開始時刻同期完了: ${startTime}`);
  }

  /** プレイヤー更新受信イベントを適用する */
  public applyReceivedUpdatePlayers(payload: UpdatePlayersPayload): void {
    this.playerSyncHandler.handlePlayerUpdates(payload);
  }

  /** プレイヤー退出受信イベントを適用する */
  public applyReceivedRemovePlayer(payload: RemovePlayerPayload): void {
    this.playerSyncHandler.handleRemovePlayer(payload);
  }

  /** マップセル更新受信イベントを適用する */
  public applyReceivedUpdateMapCells(payload: UpdateMapCellsPayload): void {
    this.mapSyncHandler.handleUpdateMapCells(payload);
  }

  /** ゲーム終了受信イベントを適用する */
  public applyReceivedGameEnd(): void {
    this.onGameEnded();
  }

  /** 爆弾設置受信イベントを適用する */
  public applyReceivedBombPlaced(payload: BombPlacedPayload): void {
    this.combatSyncHandler.handleReceivedBombPlaced(payload);
  }

  /** 爆弾設置ACK受信イベントを適用する */
  public applyReceivedBombPlacedAck(payload: BombPlacedAckPayload): void {
    this.combatSyncHandler.handleReceivedBombPlacedAck(payload);
  }

  /** プレイヤー死亡受信イベントを適用する */
  public applyReceivedPlayerDead(payload: PlayerDeadPayload): void {
    this.combatSyncHandler.handleReceivedPlayerDead(payload);
  }
}
