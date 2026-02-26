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
import type { GamePlayers } from "@client/scenes/game/application/game.types";

/** GameSceneOrchestrator の初期化入力 */
export type GameSceneOrchestratorOptions = {
  app: Application;
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  appearanceResolver: AppearanceResolver;
  getElapsedMs: () => number;
  getJoystickInput: () => { x: number; y: number };
  onGameStart: (startTime: number) => void;
  onGameEnd: () => void;
  onBombPlacedFromOthers: (payload: BombPlacedPayload) => void;
  onBombPlacedAckFromNetwork: (payload: BombPlacedAckPayload) => void;
  onPlayerDeadFromNetwork: (payload: PlayerDeadPayload) => void;
  onBombExploded: (payload: BombExplodedPayload) => void;
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
  private readonly onGameStart: (startTime: number) => void;
  private readonly onGameEnd: () => void;
  private readonly onBombPlacedFromOthers: (payload: BombPlacedPayload) => void;
  private readonly onBombPlacedAckFromNetwork: (payload: BombPlacedAckPayload) => void;
  private readonly onPlayerDeadFromNetwork: (payload: PlayerDeadPayload) => void;
  private readonly onBombExploded: (payload: BombExplodedPayload) => void;

  constructor({
    app,
    worldContainer,
    players,
    myId,
    appearanceResolver,
    getElapsedMs,
    getJoystickInput,
    onGameStart,
    onGameEnd,
    onBombPlacedFromOthers,
    onBombPlacedAckFromNetwork,
    onPlayerDeadFromNetwork,
    onBombExploded,
  }: GameSceneOrchestratorOptions) {
    this.app = app;
    this.worldContainer = worldContainer;
    this.players = players;
    this.myId = myId;
    this.appearanceResolver = appearanceResolver;
    this.getElapsedMs = getElapsedMs;
    this.getJoystickInput = getJoystickInput;
    this.onGameStart = onGameStart;
    this.onGameEnd = onGameEnd;
    this.onBombPlacedFromOthers = onBombPlacedFromOthers;
    this.onBombPlacedAckFromNetwork = onBombPlacedAckFromNetwork;
    this.onPlayerDeadFromNetwork = onPlayerDeadFromNetwork;
    this.onBombExploded = onBombExploded;
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
    const networkSync = new GameNetworkSync({
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      gameMap,
      appearanceResolver: this.appearanceResolver,
      onGameStart: this.onGameStart,
      onGameEnd: this.onGameEnd,
      onBombPlacedFromOthers: this.onBombPlacedFromOthers,
      onBombPlacedAckFromNetwork: this.onBombPlacedAckFromNetwork,
      onPlayerDeadFromNetwork: this.onPlayerDeadFromNetwork,
    });
    networkSync.bind();
    return networkSync;
  }

  /** 爆弾サブシステムを初期化する */
  private initializeBombSubsystem(): BombManager {
    return new BombManager({
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      getElapsedMs: this.getElapsedMs,
      appearanceResolver: this.appearanceResolver,
      onBombExploded: this.onBombExploded,
    });
  }

  /** ゲームループを初期化する */
  private initializeGameLoop(bombManager: BombManager): GameLoop {
    return new GameLoop({
      app: this.app,
      worldContainer: this.worldContainer,
      players: this.players,
      myId: this.myId,
      getJoystickInput: this.getJoystickInput,
      bombManager,
    });
  }
}