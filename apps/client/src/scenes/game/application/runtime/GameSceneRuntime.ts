/**
 * GameSceneRuntime
 * ゲームシーン実行中のサブシステム管理を担当する
 * 入力状態，ネットワーク同期，ループ更新の実行責務を集約する
 */
import { Application, Container, Ticker } from "pixi.js";
import { AppearanceResolver } from "../AppearanceResolver";
import { GameNetworkSync } from "../GameNetworkSync";
import { GameLoop } from "../GameLoop";
import {
  type GameSceneEventPorts,
  type GameSceneFactoryOptions,
} from "../orchestrators/GameSceneOrchestrator";
import type { GamePlayers } from "../game.types";
import type { BombManager } from "../../entities/bomb/BombManager";
import type { MoveSender } from "../network/PlayerMoveSender";
import type { GameActionSender } from "../network/GameActionSender";
import type { GameSessionFacade } from "../lifecycle/GameSessionFacade";
import { DisposableRegistry } from "../lifecycle/DisposableRegistry";
import { GameSceneRuntimeWiring } from "./GameSceneRuntimeWiring";
import { PlayerRepository } from "@client/scenes/game/entities/player/PlayerRepository";
import type { GameMapController } from "@client/scenes/game/entities/map/GameMapController";
import { config } from "@client/config";

type RuntimeLifecycleState = "created" | "initialized" | "destroyed";

export type GameSceneRuntimeOptions = {
  app: Application;
  worldContainer: Container;
  players: GamePlayers;
  myId: string;
  sessionFacade: GameSessionFacade;
  gameActionSender: GameActionSender;
  moveSender: MoveSender;
  getElapsedMs: () => number;
  eventPorts: GameSceneEventPorts;
  sceneFactories?: GameSceneFactoryOptions;
};

/** ゲームシーンの実行系サブシステムを管理する */
export class GameSceneRuntime {
  private readonly app: Application;
  private readonly worldContainer: Container;
  private readonly players: GamePlayers;
  private readonly myId: string;
  private readonly sessionFacade: GameSessionFacade;
  private readonly gameActionSender: GameActionSender;
  private readonly moveSender: MoveSender;
  private readonly getElapsedMs: () => number;
  private readonly eventPorts: GameSceneEventPorts;
  private readonly sceneFactories?: GameSceneFactoryOptions;
  private readonly playerRepository: PlayerRepository;
  private readonly disposableRegistry = new DisposableRegistry();

  private readonly appearanceResolver = new AppearanceResolver();
  private bombManager: BombManager | null = null;
  private gameMap: GameMapController | null = null;
  private networkSync: GameNetworkSync | null = null;
  private gameLoop: GameLoop | null = null;
  private joystickInput = { x: 0, y: 0 };
  private tickerHandler: ((ticker: Ticker) => void) | null = null;
  private lifecycleState: RuntimeLifecycleState = "created";

  constructor({
    app,
    worldContainer,
    players,
    myId,
    sessionFacade,
    gameActionSender,
    moveSender,
    getElapsedMs,
    eventPorts,
    sceneFactories,
  }: GameSceneRuntimeOptions) {
    this.app = app;
    this.worldContainer = worldContainer;
    this.players = players;
    this.myId = myId;
    this.sessionFacade = sessionFacade;
    this.gameActionSender = gameActionSender;
    this.moveSender = moveSender;
    this.getElapsedMs = getElapsedMs;
    this.eventPorts = eventPorts;
    this.sceneFactories = sceneFactories;
    this.playerRepository = new PlayerRepository(this.players);

    this.disposableRegistry.add(() => {
      this.clearJoystickInput();
    });
    this.disposableRegistry.add(() => {
      this.gameLoop = null;
    });
  }

  /** シーン実行に必要なサブシステムを初期化する */
  public initialize(): void {
    if (this.lifecycleState !== "created") {
      return;
    }

    const runtimeWiring = new GameSceneRuntimeWiring({
      app: this.app,
      worldContainer: this.worldContainer,
      players: this.players,
      playerRepository: this.playerRepository,
      myId: this.myId,
      appearanceResolver: this.appearanceResolver,
      getElapsedMs: this.getElapsedMs,
      getJoystickInput: () => this.joystickInput,
      moveSender: this.moveSender,
      eventPorts: this.eventPorts,
      sceneFactories: this.sceneFactories,
    });

    const initializedScene = runtimeWiring.wire();
    this.gameMap = initializedScene.gameMap;
    this.networkSync = initializedScene.networkSync;
    this.bombManager = initializedScene.bombManager;
    this.gameLoop = initializedScene.gameLoop;
    this.lifecycleState = "initialized";

    this.disposableRegistry.add(() => {
      this.gameMap?.destroy();
      this.gameMap = null;
    });
    this.disposableRegistry.add(() => {
      this.networkSync?.unbind();
      this.networkSync = null;
    });
    this.disposableRegistry.add(() => {
      this.bombManager?.destroy();
      this.bombManager = null;
    });
  }

  /** シーン実行を開始する */
  public activate(tick: (ticker: Ticker) => void): void {
    if (this.lifecycleState !== "created") {
      return;
    }

    this.initialize();
    this.readyForGame();
    this.app.ticker.add(tick);
    this.tickerHandler = tick;
  }

  public isInputEnabled(): boolean {
    return this.sessionFacade.canAcceptInput();
  }

  public setJoystickInput(x: number, y: number): void {
    this.joystickInput = this.sessionFacade.sanitizeJoystickInput({ x, y });
  }

  public clearJoystickInput(): void {
    this.joystickInput = { x: 0, y: 0 };
  }

  public placeBomb(): string | null {
    if (!this.sessionFacade.canAcceptInput()) return null;
    if (!this.bombManager) return null;
    const placed = this.bombManager.placeBomb();
    if (!placed) return null;

    this.gameActionSender.sendPlaceBomb(placed.payload);
    return placed.tempBombId;
  }

  public getBombManager(): BombManager | null {
    return this.bombManager;
  }

  public readyForGame(): void {
    this.gameActionSender.readyForGame();
  }

  public tick(ticker: Ticker): void {
    if (!this.sessionFacade.canAcceptInput()) {
      this.clearJoystickInput();
    }

    this.gameLoop?.tick(ticker);
  }

  /** チームごとの塗り率配列を返す */
  public getPaintRatesByTeam(): number[] {
    if (!this.gameMap) {
      return new Array<number>(config.GAME_CONFIG.TEAM_COUNT).fill(0);
    }

    return this.gameMap.getPaintRatesByTeam();
  }

  /** ミニマップ描画用の全セルteamId配列を返す */
  public getMiniMapTeamIds(): number[] {
    if (!this.gameMap) {
      const totalCells = config.GAME_CONFIG.GRID_COLS * config.GAME_CONFIG.GRID_ROWS;
      return new Array<number>(totalCells).fill(-1);
    }

    return this.gameMap.getAllCellTeamIds();
  }

  /** ローカルプレイヤーの現在座標を返す */
  public getLocalPlayerPosition(): { x: number; y: number } | null {
    const localPlayer = this.playerRepository.getById(this.myId);
    if (!localPlayer) {
      return null;
    }

    const position = localPlayer.getPosition();
    return {
      x: position.x,
      y: position.y,
    };
  }

  /** 実行系サブシステムを破棄する */
  public destroy(): void {
    if (this.lifecycleState === "destroyed") {
      return;
    }

    this.lifecycleState = "destroyed";
    if (this.tickerHandler) {
      this.app.ticker?.remove(this.tickerHandler);
      this.tickerHandler = null;
    }
    this.disposableRegistry.disposeAll();
  }
}
