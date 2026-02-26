/**
 * GameSceneOrchestrator
 * ゲームシーン初期化時のサブシステム配線を担当する
 * ワールド，ネットワーク，爆弾，ループの生成順序を統制する
 */
import { Application, Container } from "pixi.js";
import type {
  BombPlacedAckPayload,
  BombPlacedPayload,
  PlayerDeadPayload,
} from "@repo/shared";
import { AppearanceResolver } from "@client/scenes/game/application/AppearanceResolver";
import { GameMapController } from "@client/scenes/game/entities/map/GameMapController";
import { GameNetworkSync } from "@client/scenes/game/application/GameNetworkSync";
import { BombManager, type BombExplodedPayload } from "@client/scenes/game/entities/bomb/BombManager";
import { GameLoop } from "@client/scenes/game/application/GameLoop";
import type { MoveSender } from "@client/scenes/game/application/network/PlayerMoveSender";
import type { GamePlayers } from "@client/scenes/game/application/game.types";

/** GameNetworkSync 生成入力型 */
export type CreateNetworkSyncOptions = {
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

/** BombManager 生成入力型 */
export type CreateBombManagerOptions = {
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  getElapsedMs: () => number;
  appearanceResolver: AppearanceResolver;
  onBombExploded: (payload: BombExplodedPayload) => void;
};

/** シーン層で扱うイベント通知ポート群 */
export type GameSceneEventPorts = {
  onGameStarted: (startTime: number) => void;
  onGameEnded: () => void;
  onRemoteBombPlaced: (payload: BombPlacedPayload) => void;
  onBombPlacementAcknowledged: (payload: BombPlacedAckPayload) => void;
  onRemotePlayerDead: (payload: PlayerDeadPayload) => void;
  onBombExploded: (payload: BombExplodedPayload) => void;
};

/** GameLoop 生成入力型 */
export type CreateGameLoopOptions = {
  app: Application;
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  getJoystickInput: () => { x: number; y: number };
  bombManager: BombManager;
  moveSender: MoveSender;
};

/** サブシステム生成関数群の注入型 */
export type GameSceneFactoryOptions = {
  createNetworkSync?: (options: CreateNetworkSyncOptions) => GameNetworkSync;
  createBombManager?: (options: CreateBombManagerOptions) => BombManager;
  createGameLoop?: (options: CreateGameLoopOptions) => GameLoop;
};

/** GameSceneOrchestrator の初期化入力 */
export type GameSceneOrchestratorOptions = {
  app: Application;
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  appearanceResolver: AppearanceResolver;
  getElapsedMs: () => number;
  getJoystickInput: () => { x: number; y: number };
  moveSender: MoveSender;
  eventPorts: GameSceneEventPorts;
  factories?: GameSceneFactoryOptions;
};

/** 初期化済みサブシステム参照の戻り値型 */
export type InitializedGameScene = {
  gameMap: GameMapController;
  networkSync: GameNetworkSync;
  bombManager: BombManager;
  gameLoop: GameLoop;
};

/** ゲームシーン初期化配線を担当する */
export class GameSceneOrchestrator {
  private readonly app: Application;
  private readonly worldContainer: Container;
  private readonly players: GamePlayers;
  private readonly myId: string;
  private readonly appearanceResolver: AppearanceResolver;
  private readonly getElapsedMs: () => number;
  private readonly getJoystickInput: () => { x: number; y: number };
  private readonly moveSender: MoveSender;
  private readonly eventPorts: GameSceneEventPorts;
  private readonly createNetworkSync: (options: CreateNetworkSyncOptions) => GameNetworkSync;
  private readonly createBombManager: (options: CreateBombManagerOptions) => BombManager;
  private readonly createGameLoop: (options: CreateGameLoopOptions) => GameLoop;

  constructor({
    app,
    worldContainer,
    players,
    myId,
    appearanceResolver,
    getElapsedMs,
    getJoystickInput,
    moveSender,
    eventPorts,
    factories,
  }: GameSceneOrchestratorOptions) {
    this.app = app;
    this.worldContainer = worldContainer;
    this.players = players;
    this.myId = myId;
    this.appearanceResolver = appearanceResolver;
    this.getElapsedMs = getElapsedMs;
    this.getJoystickInput = getJoystickInput;
    this.moveSender = moveSender;
    this.eventPorts = eventPorts;
    this.createNetworkSync = factories?.createNetworkSync ?? ((options) => new GameNetworkSync(options));
    this.createBombManager = factories?.createBombManager ?? ((options) => new BombManager(options));
    this.createGameLoop = factories?.createGameLoop ?? ((options) => new GameLoop(options));
  }

  /** シーン配線を順序どおり初期化し，参照を返す */
  public initialize(): InitializedGameScene {
    const gameMap = this.initializeWorld();
    const networkSync = this.initializeNetworkSync(gameMap);
    const bombManager = this.initializeBombSubsystem();
    const gameLoop = this.initializeGameLoop(bombManager);
    return {
      gameMap,
      networkSync,
      bombManager,
      gameLoop,
    };
  }

  /** 背景マップとワールド描画コンテナを初期化する */
  private initializeWorld(): GameMapController {
    const gameMap = new GameMapController(this.appearanceResolver);
    this.worldContainer.addChild(gameMap.getDisplayObject());
    this.app.stage.addChild(this.worldContainer);
    return gameMap;
  }

  /** ネットワーク購読を初期化してバインドする */
  private initializeNetworkSync(gameMap: GameMapController): GameNetworkSync {
    const networkSync = this.createNetworkSync({
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      gameMap,
      appearanceResolver: this.appearanceResolver,
      onGameStarted: this.eventPorts.onGameStarted,
      onGameEnded: this.eventPorts.onGameEnded,
      onRemoteBombPlaced: this.eventPorts.onRemoteBombPlaced,
      onBombPlacementAcknowledged: this.eventPorts.onBombPlacementAcknowledged,
      onRemotePlayerDead: this.eventPorts.onRemotePlayerDead,
    });
    networkSync.bind();
    return networkSync;
  }

  /** 爆弾サブシステムを初期化する */
  private initializeBombSubsystem(): BombManager {
    return this.createBombManager({
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      getElapsedMs: this.getElapsedMs,
      appearanceResolver: this.appearanceResolver,
      onBombExploded: this.eventPorts.onBombExploded,
    });
  }

  /** ゲームループを初期化する */
  private initializeGameLoop(bombManager: BombManager): GameLoop {
    return this.createGameLoop({
      app: this.app,
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      getJoystickInput: this.getJoystickInput,
      bombManager,
      moveSender: this.moveSender,
    });
  }
}